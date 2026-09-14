"""Additive authored review stories; never replace existing clinical history."""
from .people import ACCOUNT_NAMES

CASEY_FINDING = 'OP-CASEY-BP'
CASEY_SOURCE = 'DOC-CASEY-BP'


def install_multi_finding_case(state):
    """Pair Casey's original chronic-condition review with an independent question."""
    if not any(m['id'] == 'MB-000005' for m in state['members']):
        return
    if not any(d['id'] == CASEY_SOURCE for d in state['documents']):
        state['documents'].append({
            'id': CASEY_SOURCE, 'member_id': 'MB-000005', 'source_member_id': 'MB-000005',
            'title': 'Blood pressure follow-up · assessment pending', 'date': '2026-09-10',
            'provider': 'Maple Ridge Health', 'kind': 'current_encounter', 'synthetic': True,
            'version': 1, 'available': True, 'signature_status': 'signed',
            'source_status': 'eligible', 'evidence_relation': 'context',
            'pages': [{'number': 1, 'sections': [
                {'heading': 'Synthetic demonstration record',
                 'text': 'Casey Morgan · MB-000005 · Service date 2026-09-10. This is a fictional record for demonstration.'},
                {'heading': 'Blood pressure assessment', 'highlight': True,
                 'text': 'An elevated office blood pressure reading was recorded. The clinician has not established a hypertension diagnosis and requested further assessment. This observation does not establish hypertension.'},
                {'heading': 'Independent review question',
                 'text': 'Review whether current documentation supports a diagnosis. Request a neutral clarification or record a reasoned no-addition outcome. The diabetes and kidney disease review remains a separate finding.'},
                {'heading': 'Signature',
                 'text': 'Electronically signed by the synthetic treating clinician at Maple Ridge Health on September 10, 2026.'},
            ]}],
        })
    if not any(o['id'] == CASEY_FINDING for o in state['opportunities']):
        state['opportunities'].append({
            'id': CASEY_FINDING, 'member_id': 'MB-000005',
            'condition': 'Blood pressure finding · assessment needed', 'type': 'clinical_suspect',
            'status': 'new', 'priority': 'Medium', 'evidence': 'Limited',
            'owner_id': 'coder', 'owner': ACCOUNT_NAMES['coder'], 'due_date': '2026-09-23',
            'version': 1, 'code': None, 'document_ids': [CASEY_SOURCE], 'synthetic': True,
            'evidence_episode_id': 'EP-CASEY-BP-2026', 'clinical_rule_version': 'casey-bp-v1',
            'clinical_context': {
                'state': 'assessment_signal', 'evidence': 'Limited', 'support_allowed': False,
                'source_ids': [CASEY_SOURCE],
                'summary': 'The signed follow-up records an elevated blood pressure reading but no established hypertension diagnosis. Review this question separately from the chronic-condition finding.',
                'next_action': 'Request a neutral assessment or record a reasoned no-addition outcome; a blood pressure observation alone does not support coding hypertension.',
            },
        })
