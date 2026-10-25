import { describe, expect, it } from 'vitest';
import type { CycleRelation, Fact } from '@/lib/db/models';
import { PACKS, evaluateRules } from '@/lib/rules/engine';

let n = 0;
const F = (key: string, value: Fact['value'], extra: Partial<Fact> = {}): Fact => ({
  id: `t${n++}`, kind: 'symptom', key, value, provenance: 'patient_reported', status: 'confirmed', ...extra,
});
const pain = (rel: CycleRelation = 'during') => F('pelvic_pain', true, { cycleRelation: rel });

/** The MINIMUM confirmed facts that make each rule fire. Unrelated optional facts are deliberately absent. */
const MIN: Record<string, Fact[]> = {
  'ENDO-01': [pain(), F('pain_pattern', 'every cycle', { kind: 'timing' })], // recurrent, no duration
  'ENDO-02': [pain(), F('missed_activity', 'classes', { kind: 'impact' })], // no days-per-month
  'ENDO-03': [F('dyspareunia', true)],
  'ENDO-04': [F('bowel_pain', true, { cycleRelation: 'during' })],
  'ENDO-05': [F('conception_difficulty', true, { kind: 'history' }), F('subfertility_months', 12, { kind: 'history' })],
  'ENDO-06': [F('analgesic_response', 'partial', { kind: 'treatment' })],
  'PCOS-01': [F('irregular_cycles', true, { kind: 'cycle' })], // no cycle length
  'PCOS-02': [F('acne', true)],
  'PCOS-03': [F('irregular_cycles', true, { kind: 'cycle' }), F('acne', true)],
};
const LEAK = /\{|\}|undefined|\bnull\b|NaN|\[object/i;

describe('rule output templates never leak placeholders', () => {
  const ids = PACKS.flatMap((p) => p.rules.map((r) => r.id));
  it('has a minimum-facts case for every rule in every pack', () => {
    expect(Object.keys(MIN).sort()).toEqual([...ids].sort());
  });
  for (const id of ids) {
    it(`${id}: fires with minimum facts and prints clean text`, () => {
      const r = evaluateRules(MIN[id]).find((x) => x.ruleId === id)!;
      expect(r.fired, `${id} should fire`).toBe(true);
      expect(r.text, id).not.toMatch(LEAK);
      expect(r.patientText, id).not.toMatch(LEAK);
      expect(r.text.trim().length).toBeGreaterThan(10);
      expect(r.text).not.toMatch(/\(\s*\)|:\s*[.;)]/); // no blank value like "duration: )"
    });
  }

  it('ENDO-01 says "duration: not stated" when only a recurrent pattern is known', () => {
    const r = evaluateRules(MIN['ENDO-01']).find((x) => x.ruleId === 'ENDO-01')!;
    expect(r.text).toBe('Persistent or recurrent pelvic pain reported (duration: not stated).');
  });
  it('ENDO-01 prints the duration when known', () => {
    const facts = [...MIN['ENDO-01'], F('pelvic_pain_duration_months', 24, { kind: 'timing' })];
    expect(evaluateRules(facts).find((x) => x.ruleId === 'ENDO-01')!.text).toContain('(duration: 24 months)');
  });
  it('ENDO-01 does not fire on a pattern alone without the pain itself', () => {
    expect(evaluateRules([F('pain_pattern', 'every cycle', { kind: 'timing' })]).some((r) => r.fired)).toBe(false);
  });
  it('an unknown (status unknown) duration is "not stated", not a value', () => {
    const facts = [...MIN['ENDO-01'], F('pelvic_pain_duration_months', null, { kind: 'timing', status: 'unknown' })];
    expect(evaluateRules(facts).find((x) => x.ruleId === 'ENDO-01')!.text).toContain('duration: not stated');
  });
  it('PCOS-01 says "cycle length: not stated" when only irregularity is reported', () => {
    expect(evaluateRules(MIN['PCOS-01']).find((x) => x.ruleId === 'PCOS-01')!.text).toContain('cycle length: not stated');
  });
  it('ENDO-02 says days per month is not stated when unknown', () => {
    expect(evaluateRules(MIN['ENDO-02']).find((x) => x.ruleId === 'ENDO-02')!.text).toContain('days per month: not stated');
  });
  it('every {placeholder} in the rule files refers to a key the engine can fill', () => {
    const outputs = PACKS.flatMap((p) => p.rules.flatMap((r) => [r.outputs.clinicianText, r.outputs.patientText]));
    const toks = outputs.flatMap((o) => o.match(/\{[^}]+\}/g) ?? []);
    expect(toks.length).toBeGreaterThan(3);
    for (const t of toks) expect(t, t).toMatch(/^\{(?:names:[a-z_|]+|[a-z_]+(?::[a-z/ ]+)?)\}$/);
  });
});
