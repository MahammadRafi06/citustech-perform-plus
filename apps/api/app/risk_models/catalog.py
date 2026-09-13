"""Explicit configuration identity; availability is not clinical or model validation."""
from copy import deepcopy
import json
import os
from pathlib import Path

MANIFEST = json.loads((Path(__file__).parent / 'assets.json').read_text())
ROOT = Path(__file__).resolve().parents[4]
MA_SEGMENTS = ['COMMUNITY_NA', 'COMMUNITY_PBA', 'COMMUNITY_FBA', 'COMMUNITY_ND', 'COMMUNITY_PBD', 'COMMUNITY_FBD', 'INSTITUTIONAL', 'NEW_ENROLLEE', 'SNP_NEW_ENROLLEE']
RX_SEGMENTS = ['CE_NonLowAged', 'CE_NonLowNonAged', 'CE_LowAged', 'CE_LowNonAged', 'CE_LTI', 'NE_NonLowCommunity', 'NE_LowCommunity', 'NE_LTI']
HHS_SEGMENTS = [f'{age}_{metal}' for age in ['ADULT', 'CHILD', 'INFANT'] for metal in ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'CATASTROPHIC']]


def output_segment(config, segment):
    if config['package'] == 'v28_2026':
        return {'NEW_ENROLLEE': 'NE', 'SNP_NEW_ENROLLEE': 'NE_SNP'}.get(segment, segment)
    return segment


def assets_root():
    return Path(os.environ.get('CT_MODEL_ASSETS', ROOT / '.local/model-assets'))


def _config(id, name, program, year, model, package, run, start, end, segments, **extra):
    spec = MANIFEST['packages'].get(package, {})
    archive = MANIFEST['archives'].get(spec.get('archive'), {})
    return dict(id=id, name=name, program=program, year=year, model_version=model,
                package=package, run_type=run, software_release=spec.get('directory', 'Reference pending'),
                service_start=start, service_end=end, supported_segments=segments,
                precision={'canonical_decimals': 3, 'component_tolerance': 0.000001, 'aggregation_decimals': 6},
                asset_sha256=archive.get('sha256'), component_sha256=spec.get('tree_sha256'),
                source_url=archive.get('url'), status='available', errors=[], warnings=[],
                capabilities={'calculate': bool(spec), 'lookup': bool(spec), 'external_only': False},
                adjustment_profile=None, **extra)


CONFIGS = {
    'ma_v28_py2026': _config('ma_v28_py2026', 'CMS-HCC V28 · 2026 Midyear/Final', 'MA', 2026, '2024 CMS-HCC V28', 'v28_2026', 'midyear_final', '2025-01-01', '2025-12-31', MA_SEGMENTS),
    'ma_v28_py2027_initial': _config('ma_v28_py2027_initial', 'CMS-HCC V28 · 2027 Initial', 'MA', 2027, '2024 CMS-HCC V28', 'v28_2027', 'initial', '2025-07-01', '2026-06-30', MA_SEGMENTS),
    'ma_v28_py2027_forecast': _config('ma_v28_py2027_forecast', 'CMS-HCC V28 · 2027 later-run forecast', 'MA', 2027, '2024 CMS-HCC V28', 'v28_2027', 'forecast', '2026-01-01', '2026-09-30', MA_SEGMENTS,
        forecast_assumptions='2027 Initial software applied to 2026 inputs through September. Not an official initial or midyear/final run; later code releases need a new validated package.'),
    'hhs_v08_by2026': _config('hhs_v08_by2026', 'HHS-HCC V08 · 2026 benefit year', 'ACA', 2026, 'HHS-HCC V08', 'hhs_2026', 'benefit_year_diy', '2026-01-01', '2026-09-30', HHS_SEGMENTS,
        coverage_note='July 31, 2026 DIY release. October–December diagnosis validity awaits updated official assets. DIY scores do not reproduce EDGE or actual transfers.', output_filename_alias='V0825.141.E1 (upstream filename); verified package benefit year is 2026'),
    'ma_v24_py2025': _config('ma_v24_py2025', 'CMS-HCC V24 · 2025 historical reference', 'MA', 2025, '2020 CMS-HCC V24', None, 'historical', '2024-01-01', '2024-12-31', MA_SEGMENTS),
}
for profile, package in [('mapd', 'rx_2027_mapd'), ('pdp', 'rx_2027_pdp')]:
    for run, start, end in [('initial', '2025-07-01', '2026-06-30'), ('forecast', '2026-01-01', '2026-09-30')]:
        id = f'rxhcc_py2027_{profile}_{run}'
        CONFIGS[id] = _config(id, f'RxHCC · 2027 {profile.upper()} {run}', 'Part D', 2027, '2027 RxHCC V08', package, run, start, end, RX_SEGMENTS, plan_profile=profile)
        if run == 'forecast':
            CONFIGS[id]['forecast_assumptions'] = '2027 Initial release used for a later-run forecast through September; not an official midyear/final result.'

for entry in CONFIGS.values():
    if entry['program'] == 'MA' and entry['package']:
        entry['adjustment_profile'] = {
            'normalization': 1.067 if entry['year'] == 2026 else 1.079,
            'coding_pattern_multiplier': 0.941,
            'order': ['divide_normalization', 'multiply_coding_pattern'],
            'source_url': f"https://www.cms.gov/files/document/{entry['year']}-announcement.pdf",
            'source_pages': '4–5' if entry['year'] == 2026 else '3, 5, 72, 75',
            'label': 'Application-transformed using CMS annual factors; not final payment',
        }
    elif entry['program'] == 'Part D':
        entry['adjustment_profile'] = {
            'normalization': 1.109 if entry['plan_profile'] == 'mapd' else 1.005,
            'order': ['divide_normalization'],
            'source_url': 'https://www.cms.gov/files/document/2027-announcement.pdf',
            'source_pages': '6', 'label': 'Application-normalized Part D score; not final payment',
        }


def catalog():
    from .evidence import validation_evidence
    from .runner import verified_package
    values = []
    for entry in CONFIGS.values():
        row = deepcopy(entry)
        package = row['package']
        if not package:
            row['status'] = 'awaiting_reference'
            row['errors'] = ['Historical V24 requires authorized SAS reference execution or independently reviewed reference values before a validated equivalent is activated.']
        elif (assets_root() / package).is_dir():
            try:
                verified_package(package)
                row['status'] = 'installed'
            except (OSError, ValueError) as error:
                row['status'] = 'asset_verification_failed'
                row['errors'] = [str(error)]
                row['capabilities']['calculate'] = False
                row['capabilities']['lookup'] = False
        else:
            row['errors'] = ['Official assets are not installed. Run the pinned model asset installer.']
            row['capabilities']['calculate'] = False
            row['capabilities']['lookup'] = False
        row['validation_evidence'] = validation_evidence(row)
        row['adapter_sha256'] = row['validation_evidence']['adapter_sha256']
        row['validation_status'] = row['validation_evidence']['status']
        if row['status'] == 'installed' and row['validation_status'] == 'validated for declared scope':
            row['status'] = row['validation_status']
        if row['run_type'] == 'forecast':
            row['warnings'].append(row['forecast_assumptions'])
        values.append(row)
    return values
