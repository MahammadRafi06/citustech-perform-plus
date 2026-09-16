import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationLabel, configurationComposition, configurationForYear } from '../src/lib/risk-context-labels.ts';

const initial = {id:'ma_v28_py2027_initial', year:2027, program:'MA', model_version:'2024 CMS-HCC V28', run_type:'initial'};
test('payment year labels preserve run type and do not invent a blended calculation', () => {
  assert.equal(configurationLabel(initial), '2027 CMS-HCC V28 Initial');
  assert.match(configurationLabel({...initial, run_type:'forecast'}), /Forecast$/);
  assert.match(configurationLabel({...initial, year:2026, run_type:'midyear_final'}), /^2026.*Midyear\/Final$/);
  assert.equal(configurationComposition(initial), '2027 (Payment Year): 100% V28 (0% V24)');
  assert.match(configurationComposition({...initial, year:2025, model_version:'2020 CMS-HCC V24'}), /reference component; blended score unavailable/);
  const blend = {...initial, year:2024, blend_components:[{model:'V24', percent:67},{model:'V28',percent:33}]};
  assert.equal(configurationLabel(blend), '2024 CMS-HCC Blend · 67% V24 and 33% V28');
  assert.equal(configurationComposition(blend), '2024 (Payment Year): 67% V24 and 33% V28');
  assert.doesNotMatch(configurationComposition({...initial, year:2028}), /100%/);
});
test('changing reporting year prefers the same program and available run', () => {
  const prior = {...initial, id:'ma_v28_py2026', year:2026, run_type:'midyear_final'};
  const aca = {...prior, id:'hhs_v08_by2026', program:'ACA'};
  assert.equal(configurationForYear([aca, prior, initial], 2026, initial).id, prior.id);
  assert.equal(configurationForYear([initial], 2024, initial), undefined);
  assert.equal(configurationLabel({...initial, program:'Part D', id:'rxhcc_py2027_mapd_initial'}), '2027 RxHCC MA-PD Initial');
});
