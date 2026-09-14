"""Model-backed opportunity unions and explicit comparable recapture inventories."""
from collections import defaultdict
from decimal import Decimal

from . import risk_inputs as inputs, risk_service as service, risk_store as store


def geography(conn, state, members, config_id, basis, county='', provider_id='', dimension='county', page=1, size=10):
    """Current directory attribution over retained, reader-scoped model outputs."""
    service.configuration(config_id, conn)
    providers = {p['id']: p['name'] for p in state['providers']}
    allowed = {m['id']: m for m in members}
    county_of = lambda m: m.get('county') or 'Unassigned county'
    options = {
        'counties': sorted({county_of(m) for m in members}),
        'providers': [{'id': pid, 'name': providers.get(pid, pid or 'Unassigned provider')}
                      for pid in sorted({m.get('provider_id', '') for m in members})],
    }
    cohort = {mid: m for mid, m in allowed.items()
              if (not county or county_of(m) == county) and (not provider_id or m.get('provider_id') == provider_id)}
    runs = {}
    for row in conn.execute('''SELECT r.id,r.member_id,r.body->'raw_score' AS raw_score,
          r.body->'monthly_scores' AS monthly_scores,s.stale FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id
          WHERE s.config_id=? AND s.score_basis=? AND r.status='completed' ''', (config_id, basis)):
        if row['member_id'] in cohort:
            runs[row['member_id']] = row
    external = config_id == service.EXTERNAL_CONFIG['id']
    values = {mid: [Decimal(str(month['raw_score'])) for month in (r['monthly_scores'] or [])
                    if month.get('raw_score') is not None] for mid, r in runs.items()}

    def aggregate(mids, include_runs=True):
        denominator = sum(len(values.get(mid, [])) for mid in mids) if not external else 0
        numerator = sum((sum(values.get(mid, []), Decimal(0)) for mid in mids), Decimal(0)) if not external else None
        return {'value': float(numerator / denominator) if denominator else None,
                'numerator': float(numerator) if numerator is not None else None, 'denominator': denominator,
                'members': len(mids), 'scored_members': sum(mid in runs for mid in mids),
                'unscored_members': sum(mid not in runs for mid in mids),
                'stale_members': sum(bool(runs[mid]['stale']) for mid in mids if mid in runs),
                **({'run_ids': [runs[mid]['id'] for mid in sorted(mids) if mid in runs]} if include_runs else {})}

    def grouped(kind, include_runs=False):
        groups = defaultdict(list)
        for mid, m in cohort.items():
            key = (county_of(m) if kind != 'provider' else '', m.get('provider_id', '') if kind != 'county' else '')
            groups[key].append(mid)
        return [{'id': c + '|' + p, 'county': c, 'provider_id': p, 'provider': providers.get(p, p),
                 'name': c if kind == 'county' else providers.get(p, p) if kind == 'provider' else c + ' · ' + providers.get(p, p),
                 **aggregate(mids, include_runs)} for (c, p), mids in sorted(groups.items())]

    total = len(cohort)
    page = min(page, max(1, (total + size - 1) // size))
    visible = sorted(cohort)[(page - 1) * size:page * size]
    return {'config_id': config_id, 'score_basis': basis, 'dimension': dimension,
            'filters': {'county': county, 'provider_id': provider_id}, 'options': options,
            'definition': 'Sum of retained raw monthly model scores divided by eligible scored member-months. Missing scores are excluded, never zero-filled. Stale results remain included and identified.',
            'attribution': 'Current member county of residence and assigned practice; historical scoring inputs are unchanged.',
            'metric': 'Raw RAF' if config_id.startswith('ma_') else 'Raw risk score',
            'limitation': 'External results require their declared rating and normalization groups; combined geography scores are unavailable.' if external else None,
            'summary': aggregate(list(cohort)), 'groups': grouped(dimension),
            # Matrix cells retain exact group provenance without repeating the
            # same 10,000 IDs in every alternate chart projection.
            'counties': grouped('county'), 'providers': grouped('provider'), 'matrix': grouped('county_provider', True),
            'members_page': {'total': total, 'page': page, 'size': size, 'items': [
                {'member_id': mid, 'name': cohort[mid]['name'], 'county': county_of(cohort[mid]),
                 'city': cohort[mid].get('city'), 'provider_id': cohort[mid].get('provider_id'),
                 'provider': providers.get(cohort[mid].get('provider_id'), cohort[mid].get('provider', 'Unassigned provider')),
                 'run_id': runs[mid]['id'] if mid in runs else None,
                 'value': runs[mid]['raw_score'] if mid in runs else None,
                 'member_months': len(values.get(mid, [])), 'stale': bool(runs[mid]['stale']) if mid in runs else False}
                for mid in visible]}}


def dashboard(conn, state, members, config_id, basis='captured_baseline', prior_config_id=None):
    """Read stored results; missing stages never become fabricated zero scores."""
    cfg = service.configuration(config_id, conn)
    allowed = {m['id']: m for m in members}
    def rows(cid, selected_basis):
        return [{**store.body(r), 'stale': r['stale']} for r in conn.execute('''
          SELECT jsonb_build_object('id',r.id,'member_id',r.member_id,'raw_score',r.body->'raw_score',
            'monthly_scores',r.body->'monthly_scores','categories',r.body->'categories') AS body,s.stale
          FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id WHERE s.config_id=? AND s.score_basis=?''',
          (cid, selected_basis)) if store.body(r)['member_id'] in allowed]
    def aggregate(selected):
        months = [m for r in selected for m in r.get('monthly_scores', []) if m.get('raw_score') is not None]
        denominator = len(months)
        numerator = sum((Decimal(str(m['raw_score'])) for m in months), Decimal(0))
        if config_id == service.EXTERNAL_CONFIG['id']:
            return {'value': None, 'numerator': None, 'denominator': 0, 'members': len(selected),
                    'run_ids': [r['id'] for r in selected], 'reason': 'Use the declared external-feed rating and normalization groups.'}
        return {'value': float(numerator / denominator) if denominator else None, 'numerator': float(numerator),
                'denominator': denominator, 'members': len(selected), 'run_ids': [r['id'] for r in selected]}
    current = rows(config_id, basis)
    by_month, categories = defaultdict(list), defaultdict(set)
    for run in current:
        for month in run.get('monthly_scores', []):
            if month.get('raw_score') is not None:
                by_month[str(month['month'])].append(Decimal(str(month['raw_score'])))
        for category in run.get('categories', []):
            if category.get('status') == 'retained' and category.get('category'):
                categories[str(category['category'])].add(run['member_id'])
    stage_rows, previous = [], None
    for stage in inputs.BASES:
        if stage == 'potential':
            continue
        stage_runs = current if stage == basis else rows(config_id, stage)
        present = {r['member_id']: r for r in stage_runs}
        item = {'basis': stage, **aggregate(stage_runs), 'stale_members': sum(bool(r['stale']) for r in stage_runs), 'movement': None}
        if previous is not None:
            matched = set(previous) & set(present)
            before, after = aggregate([previous[mid] for mid in matched]), aggregate([present[mid] for mid in matched])
            item['movement'] = {'matched_members': len(matched), 'before': before, 'after': after,
              'delta': after['value'] - before['value'] if before['value'] is not None and after['value'] is not None else None,
              'method': 'Difference of eligible member-month weighted values on the matched member cohort; unmatched members excluded.',
              'unmatched_members': len(set(previous) ^ set(present))}
        stage_rows.append(item)
        previous = present
    comparison = {'status': 'not_selected', 'reason': 'Select a comparable prior configuration.'}
    if prior_config_id:
        prior_cfg = service.configuration(prior_config_id, conn)
        if prior_cfg['program'] != cfg['program'] or prior_cfg['model_version'] != cfg['model_version']:
            comparison = {'status': 'not_comparable', 'reason': 'Different model definitions require an explicit fixed-input model comparison.'}
        else:
            prior = {r['member_id']: r for r in rows(prior_config_id, basis)}
            present = {r['member_id']: r for r in current}
            matched = sorted(set(prior) & set(present))
            before, after = aggregate([prior[mid] for mid in matched]), aggregate([present[mid] for mid in matched])
            delta = after['value'] - before['value'] if before['value'] is not None and after['value'] is not None else None
            comparison = {'status': 'available' if matched else 'unscored', 'prior_config_id': prior_config_id,
               'matched_members': len(matched), 'before': before, 'after': after, 'raw_change': delta,
               'excluded_prior_only': len(set(prior)-set(present)), 'excluded_current_only': len(set(present)-set(prior)),
               'attribution': [{'factor': 'Shared / unattributed input, age, segment and period change', 'value': delta}],
               'attribution_method': 'Raw change is retained as one reconciled residual. Causal or per-factor allocation has not been calculated.',
               'members': [{'member_id': mid, 'name': allowed[mid]['name'], 'prior_run_id': prior[mid]['id'],
                  'current_run_id': present[mid]['id'], 'delta': present[mid]['raw_score'] - prior[mid]['raw_score']} for mid in matched]}
    return {'config_id': config_id, 'score_basis': basis, 'stale': any(r['stale'] for r in current),
      'definition': 'Stored successful model outputs; no missing stage or score is replaced by zero.', 'unit': 'score points',
      'weighting': 'Eligible member-month weighted internal portfolio measure', 'scope_members': len(members),
      'monthly': [{'month': month, 'value': float(sum(values) / len(values)), 'numerator': float(sum(values)),
                   'denominator': len(values)} for month, values in sorted(by_month.items())],
      'category_prevalence': [{'category': c, 'members': len(mids), 'denominator': len(current), 'member_ids': sorted(mids)}
         for c, mids in sorted(categories.items(), key=lambda item: (-len(item[1]), item[0]))],
      'stages': stage_rows, 'comparison': comparison}


def opportunity_impact(conn, state, members, config_id, finding_ids, actor):
    all_findings = {f['id']: f for f in state['opportunities']}
    allowed = {m['id']: m for m in members}
    selected = []
    for fid in dict.fromkeys(finding_ids):
        finding = all_findings.get(fid)
        if not finding or finding['member_id'] not in allowed:
            raise ValueError('A finding is outside the selected member scope.')
        proposals = inputs.candidate_changes(state, allowed[finding['member_id']], config_id)
        proposal = next((p for p in proposals if p['finding_id'] == fid), None)
        if not proposal or not proposal.get('code'):
            raise ValueError('The selected finding has no declared coding-input hypothesis.')
        selected.append(proposal)
    grouped = defaultdict(list)
    for p in selected:
        grouped[p['member_id']].append(p)
    comparisons = []
    for mid, proposals in grouped.items():
        baseline = store.current(conn, mid, config_id, 'qa_supported') or store.current(conn, mid, config_id)
        if not baseline:
            baseline = service.calculate(conn, allowed[mid], config_id, actor=actor)
        if baseline['status'] != 'completed':
            raise ValueError('A valid baseline is required for every selected member.')
        frozen = store.get_input(conn, baseline['snapshot_id'])
        additions, removals = [], []
        for p in proposals:
            if p['operation'] == 'delete':
                originals = [d for d in frozen['diagnoses'] if d.get('original_record_id') == 'SUB-0001']
                removals.extend(d['id'] for d in originals)
            else:
                additions.append({'code': p['code'], 'service_date': p.get('service_date') or service.configuration(config_id)['service_end'], 'source_id': p.get('source_id')})
        unique_additions = {store.digest(a): a for a in additions}
        comparison = service.scenario(conn, allowed[mid], config_id, baseline_run_id=baseline['id'],
                     additions=list(unique_additions.values()), removals=list(dict.fromkeys(removals)), actor=actor)
        item = {'member_id': mid, 'finding_ids': [p['finding_id'] for p in proposals], 'baseline_run_id': baseline['id'],
                'scenario_run_id': comparison['scenario']['id'], 'config_id': config_id, 'delta': comparison['delta'],
                'baseline_score': baseline['raw_score'], 'scenario_score': comparison['scenario']['raw_score'],
                'member_months': len(baseline.get('monthly_scores', [])), 'label': 'If supported',
                'status': comparison['scenario']['status'], 'overlap_method': 'Full member recalculation of the selected input union once',
                'errors': comparison['scenario'].get('errors', []), 'actor_id': actor}
        comparisons.append(item)
        store.record(conn, 'opportunity_impact' if len(proposals) == 1 else 'combined_impact', item, mid)
    if any(c['delta'] is None for c in comparisons):
        total = weighted = None
    else:
        total = float(sum((Decimal(str(c['delta'])) for c in comparisons), Decimal(0)))
        weight = sum(c['member_months'] for c in comparisons)
        weighted = float(sum((Decimal(str(c['delta'])) * c['member_months'] for c in comparisons), Decimal(0)) / weight) if weight else None
    return {'items': comparisons, 'config_id': config_id, 'finding_count': len(selected), 'member_count': len(comparisons),
            'combined_member_score_point_change': total, 'selected_cohort_weighted_delta': weighted,
            'denominator_member_months': sum(c['member_months'] for c in comparisons),
            'basis': 'Hypothetical union by member; selected-cohort member-month weighting. No guaranteed clinical, receiver or financial outcome.'}


def inventory(conn, state, members, config_id, prior_config_id='ma_v28_py2026'):
    current_cfg, prior_cfg = service.configuration(config_id), service.configuration(prior_config_id)
    compatible = (current_cfg['program'] == prior_cfg['program'] and current_cfg['model_version'] == prior_cfg['model_version']
                  and prior_cfg.get('service_end', '') < current_cfg.get('service_start', ''))
    if not compatible:
        return {'items': [], 'exclusions': [{'reason': 'Recapture requires non-overlapping prior/current periods and reviewed comparable category definitions.'}],
                'clinical': {'numerator': 0, 'denominator': 0}, 'receiver_eligible': {'numerator': 0, 'denominator': 0},
                'status': 'not_comparable', 'config_id': config_id, 'prior_config_id': prior_config_id}
    allowed = {m['id']: m for m in members}
    def runs(cid, basis):
        rows = conn.execute('''SELECT r.member_id,r.id,r.body->'categories' AS categories,s.stale
           FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id WHERE s.config_id=? AND s.score_basis=?''', (cid, basis))
        return {r['member_id']: r for r in rows if r['member_id'] in allowed}
    prior, current, supported, eligible = runs(prior_config_id, 'captured_baseline'), runs(config_id, 'captured_baseline'), runs(config_id, 'qa_supported'), runs(config_id, 'eligible')
    findings = defaultdict(list)
    for f in state['opportunities']:
        findings[f['member_id']].append(f)
    items, excluded = [], []
    def retained(run, approved_only=False):
        return {str(c['category']) for c in (run or {}).get('categories', []) if c.get('category') and c.get('status') == 'retained'
                and (not approved_only or any(str(d).startswith('APPROVED-') for d in c.get('diagnosis_ids', [])))}
    for mid, previous in prior.items():
        seen = set()
        for category in previous['categories'] or []:
            key = str(category.get('category') or '')
            if not key or key in seen or category.get('status') != 'retained':
                continue
            seen.add(key)
            now = current.get(mid)
            current_categories = retained(now)
            approved_categories = retained(supported.get(mid), approved_only=True)
            receiver_categories = retained(eligible.get(mid), approved_only=True)
            approved = key in approved_categories and not supported[mid]['stale']
            # Unsupported is not proof that a historical condition is no longer
            # current. Only an explicit independent not-current assessment could
            # remove that pair from an eligibility denominator.
            ineligible = False
            reason = 'Assessed as not current under the retained QA decision.' if ineligible else 'Current member has not been scored.' if not now else None
            comparable = bool(now) and not ineligible and not previous['stale'] and not now['stale']
            row = {'id': f'RECAPTURE-{mid}-{key}', 'member_id': mid, 'member_name': allowed[mid]['name'],
                 'category': key, 'condition': category.get('description', key), 'code': category.get('code'),
                 'prior_config_id': prior_config_id, 'config_id': config_id,
                 'prior_run_id': previous['id'], 'current_run_id': now['id'] if now else None,
                 'prior_period': prior_cfg['service_start'] + ' / ' + prior_cfg['service_end'],
                 'current_period': current_cfg['service_start'] + ' / ' + current_cfg['service_end'],
                 'source_ids': category.get('source_ids', []),
                 'state': 'assessed_not_current' if ineligible else 'recaptured' if approved else 'coded_pending_downstream' if key in current_categories else 'assessment_due',
                 'clinical_recaptured': approved, 'receiver_eligible_recaptured': key in receiver_categories and not eligible[mid]['stale'],
                 'denominator_eligible': comparable, 'exclusion_reason': reason or ('Stale input comparison' if not comparable else None),
                 'comparability': 'Same named model definition with actual mapped prior/current outputs; different model families are excluded.'}
            (items if comparable else excluded).append(row)
    denominator = len(items)
    return {'items': items, 'exclusions': excluded, 'config_id': config_id, 'prior_config_id': prior_config_id,
            'clinical': {'numerator': sum(r['clinical_recaptured'] for r in items), 'denominator': denominator},
            'receiver_eligible': {'numerator': sum(r['receiver_eligible_recaptured'] for r in items), 'denominator': denominator},
            'definition': 'Distinct comparable member-category pairs; QA-supported and receiver-eligible stages are separate.',
            'unit': 'eligible member-category pairs', 'prior_scored_members': len(prior), 'current_scored_members': len(current),
            'status': 'available' if prior else 'awaiting_prior_calculation'}
