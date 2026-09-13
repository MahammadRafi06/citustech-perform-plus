"""Engine acceptance against separately executed, frozen official CMS outputs.

No PostgreSQL connection or running business state is used by these tests.
"""
from collections import defaultdict
from copy import deepcopy
import json
import hashlib
from pathlib import Path

import pytest

from apps.api.app.risk_models import calculate, calculate_many, catalog, lookup
from apps.api.app.risk_models.catalog import assets_root
from apps.api.app.risk_models.runner import clear_cache

HERE = Path(__file__).parent / 'model_reference'
CASES = json.loads((HERE / 'cases.json').read_text())
CONFIG = {'v28_2026': 'ma_v28_py2026', 'v28_2027': 'ma_v28_py2027_initial', 'rx_2027_mapd': 'rxhcc_py2027_mapd_initial', 'rx_2027_pdp': 'rxhcc_py2027_pdp_initial', 'hhs_2026': 'hhs_v08_by2026'}


def snapshot(case):
    person, segment = case['person'], case['segment']
    row = {'month': f'{case["year"]}-01', 'dual_status': 'full' if 'FB' in segment else 'partial' if 'PB' in segment else 'none',
           'medicaid': bool(person.get('LTIMCAID')), 'institutional': segment in ('INSTITUTIONAL', 'CE_LTI', 'NE_LTI'),
           'new_enrollee': 'NEW_ENROLLEE' in segment or segment.startswith('NE_'), 'c_snp': segment == 'SNP_NEW_ENROLLEE',
           'esrd': bool(person.get('ESRD')), 'pace': False, 'lis': segment in ('CE_LowAged', 'CE_LowNonAged', 'NE_LowCommunity')}
    value = {'member_id': case['id'], 'dob': person['DOB'], 'sex': person['SEX'], 'orec': person.get('OREC', 0), 'enrollment': [row],
             'diagnoses': [{'id': f'D{index}', 'code': code, 'service_date': case['service_date'], 'source_id': 'AUTHORED-SYNTHETIC-REFERENCE',
                            'encounter_id': 'REFERENCE-ENCOUNTER', 'source_type': 'professional', 'eligible_service': True, 'audio_only': False}
                           for index, code in enumerate(case['diagnoses'])]}
    if case['package'] == 'hhs_2026':
        value['enrollment'] = [{'month': '2026-09'}]
        value['aca'] = {'metal': person['METAL'], 'csr_indicator': person['CSR_INDICATOR'], 'enrollment_duration': person['ENROLDURATION'], 'last_enrollment_date': case['last_enrollment_date']}
        for kind in ('ndc', 'hcpcs'):
            value[kind] = [{'id': f'{kind}{index}', 'code': code, 'service_date': case['service_date'], 'source_id': 'AUTHORED-SYNTHETIC-REFERENCE'} for index, code in enumerate(case.get(kind, []))]
    return value


@pytest.fixture(scope='module')
def reference_results():
    if not (HERE / 'expected.json').exists():
        pytest.fail('Generate independent stock CMS expected outputs before claiming validation')
    for package in CONFIG:
        if not (assets_root() / package).is_dir():
            pytest.fail(f'Install pinned official assets for reference acceptance: {package}')
    clear_cache()
    grouped = defaultdict(list)
    for case in CASES:
        grouped[case['package']].append(case)
    actual = {}
    for package, cases in grouped.items():
        results = calculate_many(CONFIG[package], [snapshot(case) for case in cases])
        actual.update({case['id']: result for case, result in zip(cases, results)})
    return actual


@pytest.mark.parametrize('case', CASES, ids=lambda case: case['id'])
def test_independent_official_reference(case, reference_results):
    evidence = json.loads((HERE / 'expected.json').read_text())
    assert evidence['cases_sha256'] == hashlib.sha256((HERE / 'cases.json').read_bytes()).hexdigest()
    expected = evidence['cases'][case['id']]
    actual = reference_results[case['id']]
    assert actual['status'] == 'completed', actual['errors']
    assert actual['selected_segment'] == case['segment']
    assert actual['reference_output'] == expected['scores']
    output = {'NEW_ENROLLEE': 'NE', 'SNP_NEW_ENROLLEE': 'NE_SNP'}.get(case['segment'], case['segment']) if case['package'] == 'v28_2026' else case['segment']
    assert actual['raw_score'] == expected['scores']['SCORE_' + output]
    assert abs(actual['component_total'] + actual['rounding_residual'] - actual['raw_score']) < 0.000001
    assert abs(actual['rounding_residual']) <= 0.000501
    assert actual['component_sha256'] == evidence['packages'][case['package']]['tree_sha256']
    assert actual['provenance']['unchanged_official_software']


def ma_case():
    return snapshot(next(case for case in CASES if case['id'] == 'v28_2027_hf'))


def test_monthly_routing_and_annual_transformations():
    item = ma_case()
    item['enrollment'].append(dict(item['enrollment'][0], month='2027-02', dual_status='full', medicaid=True))
    actual = calculate('ma_v28_py2027_initial', item)
    assert actual['status'] == 'completed', actual['errors']
    assert actual['selected_segment'] == 'MIXED_MONTHLY'
    assert [r['segment'] for r in actual['monthly_scores']] == ['COMMUNITY_NA', 'COMMUNITY_FBA']
    scores = actual['reference_output']
    assert actual['raw_score'] == round((scores['SCORE_COMMUNITY_NA'] + scores['SCORE_COMMUNITY_FBA']) / 2, 6)
    assert actual['adjusted_score'] == round(actual['raw_score'] / 1.079 * 0.941, 6)


@pytest.mark.parametrize('package', ['v28_2026', 'v28_2027'])
@pytest.mark.parametrize('kind', ['institution', 'new_enrollee'])
def test_monthly_medicaid_uses_each_effective_official_input_profile(package, kind, reference_results):
    zero_name = 'institution_no_medicaid' if kind == 'institution' else 'new_enrollee'
    one_name = 'institution' if kind == 'institution' else 'new_enrollee_medicaid'
    case = next(case for case in CASES if case['id'] == package + '_' + zero_name)
    value = snapshot(case)
    value['enrollment'].append(dict(value['enrollment'][0], month=f'{case["year"]}-02', medicaid=True))
    actual = calculate(CONFIG[package], value)
    assert actual['status'] == 'completed', actual['errors']
    expected = [reference_results[package + '_' + name]['raw_score'] for name in (zero_name, one_name)]
    assert [month['raw_score'] for month in actual['monthly_scores']] == expected
    assert actual['raw_score'] == round(sum(expected) / 2, 6)
    assert abs(actual['component_total'] + actual['rounding_residual'] - actual['raw_score']) < 0.000001
    assert len(actual['provenance']['monthly_input_profiles']) == 2


def test_source_period_modality_switch_and_duplicate_validation():
    base = ma_case()
    for change, reason in [({'service_date': '2030-01-01'}, 'window'), ({'audio_only': True}, 'Audio-only'),
                           ({'eligible_service': False}, 'eligible service'), ({'code': 'NOT-A-CODE'}, 'format'),
                           ({'source_id': ''}, 'provenance'), ({'source_type': 'unlinked_chart_review'}, 'switch exception')]:
        item = deepcopy(base)
        item['diagnoses'][0].update(change)
        result = calculate('ma_v28_py2027_initial', item)
        assert result['status'] == 'completed', result['errors']
        assert any(reason in row['reason'] for row in result['exclusions'])
        assert result['raw_score'] == result['reference_output']['SCORE_COMMUNITY_NA']
        assert not result['categories']
    item = deepcopy(base)
    item['diagnoses'][0].update(source_type='unlinked_chart_review', parent_org_at_service='MA-A', parent_org_at_submission='MA-B', prior_program='MA')
    assert not calculate('ma_v28_py2027_initial', item)['exclusions']
    duplicated = deepcopy(base)
    duplicated['diagnoses'].append(dict(duplicated['diagnoses'][0], id='SECOND-SOURCE'))
    actual = calculate('ma_v28_py2027_initial', duplicated)
    assert actual['raw_score'] == calculate('ma_v28_py2027_initial', base)['raw_score']
    assert any('Duplicate' in row['reason'] for row in actual['exclusions'])


def test_initial_vs_forecast_preserves_source_date():
    item = ma_case()
    item['diagnoses'][0]['service_date'] = '2026-08-24'
    initial = calculate('ma_v28_py2027_initial', item)
    forecast = calculate('ma_v28_py2027_forecast', item)
    assert initial['exclusions'] and not forecast['exclusions']
    assert forecast['raw_score'] > initial['raw_score']
    assert forecast['run_type'] == 'forecast'
    assert 'initial' in forecast['software_release']
    assert forecast['warnings']
    assert item['diagnoses'][0]['service_date'] == '2026-08-24'


def test_missing_status_and_known_exceptional_routes_do_not_fall_through():
    for change in [{'esrd': True}, {'pace': True}]:
        item = ma_case()
        item['enrollment'][0].update(change)
        result = calculate('ma_v28_py2027_initial', item)
        assert result['status'] == 'unavailable' and result['raw_score'] is None
    item = ma_case()
    del item['enrollment'][0]['dual_status']
    result = calculate('ma_v28_py2027_initial', item)
    assert result['status'] == 'failed' and result['raw_score'] is None
    assert calculate('ma_v24_py2025', item)['status'] == 'unavailable'
    assert calculate('unknown-model', item)['status'] == 'failed'


def test_add_remove_overlap_and_real_interaction(reference_results):
    result = lambda name: reference_results['v28_2027_' + name]
    assert result('hf')['raw_score'] > result('demographic')['raw_score']
    assert result('suppressed_hf')['raw_score'] == result('acute_hf')['raw_score']
    assert any(c['status'] == 'suppressed' and c['code'] == 'I5022' for c in result('suppressed_hf')['categories'])
    assert any(c['factor'] == 'DIABETES_HF_V28' and c['contribution'] > 0 for c in result('diabetes_hf')['components'])


def test_aca_rejects_unpublished_code_window_without_double_csr(reference_results):
    case = next(case for case in CASES if case['id'] == 'hhs_2026_csr')
    result = reference_results[case['id']]
    assert result['adjusted_score'] == result['reference_output']['CSR_ADJUSTED_SCORE_ADULT_SILVER']
    assert result['transformations'][0]['already_applied_by_official_runner']
    item = snapshot(case)
    item['diagnoses'][0]['service_date'] = '2026-10-01'
    actual = calculate('hhs_v08_by2026', item)
    assert any('window' in row['reason'] for row in actual['exclusions'])


def test_asset_tampering_fails_without_stale_score(tmp_path, monkeypatch):
    import shutil
    destination = tmp_path / 'v28_2027'
    shutil.copytree(assets_root() / 'v28_2027', destination)
    target = destination / 'software/CMS_HCC_v28/data/input/internal/V28_CE_Relative_Factors.csv'
    target.write_text(target.read_text() + '\n')
    monkeypatch.setenv('CT_MODEL_ASSETS', str(tmp_path))
    clear_cache()
    result = calculate('ma_v28_py2027_initial', ma_case())
    assert result['status'] == 'failed' and result['raw_score'] is None
    assert 'asset changed' in result['errors'][0]


def test_catalog_and_lookup_are_program_specific():
    configurations = {row['id']: row for row in catalog()}
    assert configurations['ma_v28_py2027_initial']['service_end'] == '2026-06-30'
    assert configurations['hhs_v08_by2026']['service_end'] == '2026-09-30'
    assert configurations['rxhcc_py2027_mapd_initial']['adjustment_profile']['normalization'] == 1.109
    assert configurations['rxhcc_py2027_pdp_initial']['adjustment_profile']['normalization'] == 1.005
    assert lookup('ma_v28_py2027_initial', 'I50.22')[0]['category'] == 'HCC226'
    assert lookup('rxhcc_py2027_mapd_initial', 'I50.22')[0]['category'] == 'RXHCC186'
    assert lookup('hhs_v08_by2026', 'I50.22')[0]['category'] == 'HHS_HCC130'
    assert lookup('hhs_v08_by2026', 'I50.22')[0]['description'] == 'Heart Failure'
    assert lookup('hhs_v08_by2026', 'I50.22')[0]['code_description'] == 'Chronic systolic (congestive) heart failure'


@pytest.mark.parametrize('package,normalization,multiplier', [('v28_2026', 1.067, 0.941), ('v28_2027', 1.079, 0.941), ('rx_2027_mapd', 1.109, 1), ('rx_2027_pdp', 1.005, 1)])
def test_annual_factor_profiles(package, normalization, multiplier, reference_results):
    case = next(case for case in CASES if case['package'] == package)
    actual = reference_results[case['id']]
    assert actual['adjusted_score'] == round(actual['raw_score'] / normalization * multiplier, 6)


@pytest.mark.parametrize('profile', ['mapd', 'pdp'])
def test_part_d_later_window_forecast(profile):
    case = next(case for case in CASES if case['package'] == 'rx_2027_' + profile and case['diagnoses'])
    item = snapshot(case)
    for diagnosis in item['diagnoses']:
        diagnosis['service_date'] = '2026-08-20'
    initial = calculate(f'rxhcc_py2027_{profile}_initial', item)
    forecast = calculate(f'rxhcc_py2027_{profile}_forecast', item)
    assert initial['exclusions'] and not forecast['exclusions']
    assert forecast['status'] == 'completed' and forecast['warnings']
    assert forecast['raw_score'] >= initial['raw_score']


def test_validation_receipt_never_trusts_fixture_presence(tmp_path, monkeypatch):
    from apps.api.app.risk_models import evidence
    from apps.api.app.risk_models.catalog import CONFIGS
    receipt_path = tmp_path / 'receipt.json'
    monkeypatch.setattr(evidence, 'RECEIPT', receipt_path)
    config = CONFIGS['ma_v28_py2027_initial']
    assert evidence.validation_evidence(config)['status'] == 'reference_evidence_required'
    receipt_path.write_text(json.dumps({'expected_fixture_exists': True, 'status': 'passed'}))
    assert evidence.validation_evidence(config)['status'] == 'reference_evidence_required'
    # Even a receipt with complete test metadata cannot authorize changed code.
    receipt_path.write_text(json.dumps({'adapter': {'sha256': 'stale'},
        'configurations': {config['id']: {}}, 'acceptance_execution': {}}))
    assert evidence.validation_evidence(config)['status'] == 'reference_evidence_required'
