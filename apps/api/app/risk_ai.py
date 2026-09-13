"""Read-only retained model output with validation outside the generating model."""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
from typing import Literal
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from .risk_store import digest

ROOT = Path(__file__).resolve().parents[3]
ARTIFACT = ROOT / 'seed/risk/ai-classification-replays-v1.json'
Status = Literal['current', 'history', 'negated', 'uncertain', 'family', 'conflicting', 'abstain']
MODEL_INSTRUCTIONS = re.compile(
    r'ignore\s+(?:(?:all|the)\s+)?(?:previous|prior|system|developer)\s+(?:instructions|rules|messages)'
    r'|(?:reveal|print|repeat|override)\s+(?:the\s+)?(?:system\s+prompt|developer\s+message)'
    r'|<(?:system|developer|tool_call)>|\byou\s+are\s+(?:chatgpt|an?\s+ai\s+assistant)\b'
    r'|(?:execute|run)\s+(?:this\s+)?(?:shell\s+command|tool\s+call)', re.I)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)


class Citation(StrictModel):
    member_id: str = Field(min_length=1, max_length=100)
    document_id: str = Field(min_length=1, max_length=100)
    source_version: int = Field(ge=1)
    source_hash: str = Field(pattern=r'^[a-f0-9]{64}$')
    page: int = Field(ge=1)
    section: str = Field(min_length=1, max_length=300)
    start: int = Field(ge=0)
    end: int = Field(ge=1)
    quote: str = Field(min_length=1, max_length=8000)


class Classification(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    condition: str = Field(min_length=1, max_length=200)
    status: Status
    explanation: str = Field(min_length=1, max_length=1600)
    citations: list[Citation] = Field(min_length=1, max_length=10)


class RetainedOutput(StrictModel):
    schema_version: Literal[1]
    member_id: str = Field(min_length=1, max_length=100)
    status: Status
    summary: str = Field(min_length=1, max_length=2000)
    classifications: list[Classification] = Field(max_length=20)
    abstention_reason: str | None = Field(default=None, max_length=2000)
    clinical_authority: Literal[False]

    @model_validator(mode='before')
    @classmethod
    def explicit_no_authority(cls, value):
        if not isinstance(value, dict) or value.get('clinical_authority') is not False:
            raise ValueError('clinical_authority must be the explicit boolean false.')
        return value

    @model_validator(mode='after')
    def require_evidence_or_abstention(self):
        if self.status == 'abstain' and not (self.abstention_reason or '').strip():
            raise ValueError('Abstention requires a reason.')
        if not self.classifications and self.status != 'abstain':
            raise ValueError('An uncited result must abstain.')
        if len({row.id for row in self.classifications}) != len(self.classifications):
            raise ValueError('Classification identities must be unique.')
        return self


def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def source_snapshot(document):
    value = {'document_id': document['id'], 'member_id': document['member_id'],
             'source_version': document.get('version', 1),
             'metadata': {key: deepcopy(document.get(key)) for key in
                          ('source_member_id', 'date', 'kind', 'signature_status', 'source_status',
                           'evidence_relation', 'requires_publication', 'published_at')},
             'pages': deepcopy(document.get('pages', []))}
    return {**value, 'source_hash': digest(value)}


def input_snapshot(state, member_id):
    sources = [source_snapshot(document) for document in state['documents']
               if document['member_id'] == member_id and document.get('available', True)
               and document.get('source_status') != 'not_loaded']
    sources.sort(key=lambda row: row['document_id'])
    return {'member_id': member_id,
            'coverage': 'All available clinical documents for this member, including historical or unusable sources; no unavailable future source is assumed.',
            'source_set_hash': digest({'member_id': member_id, 'sources': sources}), 'sources': sources}


def load_replays():
    return json.loads(ARTIFACT.read_text())['replays']


def parse_output(raw):
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('Duplicate output fields are ambiguous.')
            result[key] = value
        return result
    return RetainedOutput.model_validate(json.loads(raw, object_pairs_hook=unique_object))


def validate_replay(artifact, state, member_id):
    """Validate identity, unchanged complete input, exact citations and no authority."""
    errors = []
    def reject(code, message):
        errors.append({'code': code, 'message': message})
    if artifact.get('member_id') != member_id or artifact.get('input', {}).get('member_id') != member_id:
        reject('MEMBER_MISMATCH', 'The retained result is outside this member scope.')
    if artifact.get('artifact_sha256') != digest({key: value for key, value in artifact.items() if key != 'artifact_sha256'}):
        reject('ARTIFACT_CHANGED', 'The retained artifact does not match its recorded content hash.')
    raw = artifact.get('raw_output', '')
    if not isinstance(raw, str) or len(raw) > 100000 or artifact.get('raw_output_sha256') != sha256(raw):
        reject('OUTPUT_CHANGED', 'The retained raw output is unavailable or changed.')
        raw = '{}'
    if artifact.get('prompt_sha256') != sha256(artifact.get('prompt', '')):
        reject('PROMPT_CHANGED', 'The retained prompt does not match its recorded hash.')
    try:
        output = parse_output(raw)
    except (ValidationError, ValueError, TypeError):
        output = None
        reject('OUTPUT_SCHEMA', 'Output must contain only the bounded classification schema, with evidence or an explicit abstention.')
    frozen = artifact.get('input', {})
    sources = frozen.get('sources', [])
    if frozen.get('source_set_hash') != digest({'member_id': member_id, 'sources': sources}):
        reject('INPUT_CHANGED', 'The retained source-set hash is inconsistent.')
    current = input_snapshot(state, member_id)
    if current['source_set_hash'] != frozen.get('source_set_hash'):
        reject('STALE_SOURCE_SET', 'Available member sources changed after this output was authored. A new validated output is required.')
    by_id = {}
    for source in sources:
        if source.get('member_id') != member_id or source.get('metadata', {}).get('source_member_id') not in (None, member_id):
            reject('SOURCE_MEMBER_MISMATCH', 'A retained source does not identify this member.')
        if source.get('document_id') in by_id:
            reject('DUPLICATE_SOURCE', 'Source document identities must be unique.')
        by_id[source.get('document_id')] = source
        if source.get('source_hash') != digest({key: value for key, value in source.items() if key != 'source_hash'}):
            reject('SOURCE_HASH_MISMATCH', 'A retained source has changed content or metadata.')
        for page in source.get('pages', []):
            for section in page.get('sections', []):
                if MODEL_INSTRUCTIONS.search(section.get('text', '')):
                    reject('SOURCE_INSTRUCTIONS', 'Instruction-bearing source text cannot be replayed as trusted model context.')
    if output:
        if output.member_id != member_id:
            reject('OUTPUT_MEMBER_MISMATCH', 'The model output identifies a different member.')
        if MODEL_INSTRUCTIONS.search(output.summary) or any(MODEL_INSTRUCTIONS.search(row.explanation+' '+row.condition) for row in output.classifications):
            reject('OUTPUT_INSTRUCTIONS', 'The output contains model-directed instructions outside the bounded task.')
        for row in output.classifications:
            for citation in row.citations:
                source = by_id.get(citation.document_id)
                if not source or citation.member_id != member_id:
                    reject('CITATION_SCOPE', 'A citation is outside the retained member/source input.')
                    continue
                if citation.source_hash != source['source_hash'] or citation.source_version != source['source_version']:
                    reject('CITATION_VERSION', 'A citation does not match the exact retained source hash and version.')
                passages = [section['text'] for page in source['pages'] if page['number'] == citation.page
                            for section in page['sections'] if section['heading'] == citation.section]
                if (len(passages) != 1 or citation.end <= citation.start or citation.end > len(passages[0])
                        or passages[0][citation.start:citation.end] != citation.quote):
                    reject('CITATION_SPAN', 'The quoted character span does not exactly match its identified source passage.')
        if any(row.status == 'conflicting' and len(row.citations) < 2 for row in output.classifications):
            reject('CONFLICT_EVIDENCE', 'A conflicting classification must retain both cited statements.')
    return {'valid': not errors, 'errors': errors, 'source_set_hash': current['source_set_hash'],
            'validator': 'external deterministic identity/hash/span/schema validator v1',
            'semantic_validation': 'Classification meaning requires reviewer assessment; exact source matching is not clinical validation.'}


def register(app, *, db, user, get_state, member):
    router = APIRouter(prefix='/api/v1/risk/members', tags=['Retained AI review'])
    def metadata(artifact, validation):
        return {'id': artifact['id'], 'name': artifact['name'], 'retained_at': artifact['retained_at'],
                'status': 'available' if validation['valid'] else 'stale' if any(e['code'] == 'STALE_SOURCE_SET' for e in validation['errors']) else 'invalid',
                'provenance': artifact['provenance'], 'limitations': artifact['limitations'], 'validation': validation}

    @router.get('/{mid}/ai')
    def list_member_replays(mid: str, u=Depends(user)):
        with db() as conn:
            state=get_state(conn);member(state,u,mid)
            rows=[metadata(item,validate_replay(item,state,mid)) for item in load_replays() if item['member_id']==mid]
            return {'member_id':mid,'mode':'retained_output_replay','live_inference':False,'clinical_authority':False,
                    'items':rows,'limitations':['No runtime inference or clinical decision is performed. Exact model build attestation and positive family-history example acceptance remain open.']}

    @router.get('/{mid}/ai/{replay_id}')
    def replay(mid: str, replay_id: str, u=Depends(user)):
        with db() as conn:
            state=get_state(conn);member(state,u,mid)
            artifact=next((item for item in load_replays() if item['id']==replay_id and item['member_id']==mid),None)
            if not artifact:
                raise HTTPException(404,detail={'code':'AI_REPLAY_NOT_FOUND','message':'No retained output is available for this member and replay.'})
            validation=validate_replay(artifact,state,mid)
            if not validation['valid']:
                stale=any(error['code']=='STALE_SOURCE_SET' for error in validation['errors'])
                raise HTTPException(409,detail={'code':'STALE_AI_REPLAY' if stale else 'INVALID_AI_REPLAY',
                    'message':'The retained output cannot be replayed against this source set.','validation':validation})
            output=json.loads(artifact['raw_output'])
            for row in output['classifications']:
                for citation in row['citations']:
                    citation['href']='/members/'+mid+'?'+urlencode({'tab':'Evidence & documents','document':citation['document_id'],
                        'page':citation['page'],'section':citation['section']})
            return {**metadata(artifact,validation),**output,'origin':'codex_retained_model_output',
                    'mode':'retained_output_replay','live_inference':False,'input':artifact['input'],
                    'prompt':artifact['prompt'],'raw_output':artifact['raw_output'],
                    'raw_output_sha256':artifact['raw_output_sha256'],'artifact_sha256':artifact['artifact_sha256']}
    app.include_router(router)
