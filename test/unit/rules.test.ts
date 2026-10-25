import { describe, expect, it } from 'vitest';
import { evaluateRules, firedRules } from '@/lib/rules/engine';
import { activePathways, computeMissing } from '@/lib/rules/missing';
import { FOLLOWUPS, factFromAnswer, nextFollowups } from '@/lib/rules/followups';
import pcosPack from '@/rules/pcos.json';
import endoPack from '@/rules/endometriosis.json';
import { storyFrom, text } from './helpers';

const ids = (facts: ReturnType<typeof storyFrom>['facts']) => firedRules(facts).map((r) => r.ruleId).sort();

describe('rules engine', () => {
  it('only CONFIRMED facts count: nothing fires from unconfirmed candidates', () => {
    const s = storyFrom(text(0), { confirm: false });
    expect(ids(s.facts)).toEqual([]);
  });

  it('demo story fires ENDO-01/02/03/04/06 once confirmed, and not PCOS or ENDO-05', () => {
    const s = storyFrom(text(0));
    expect(ids(s.facts)).toEqual(['ENDO-01', 'ENDO-02', 'ENDO-03', 'ENDO-04', 'ENDO-06']);
  });

  it('ENDO-04 needs periods-related bowel/urinary pain: unknown relation does not fire', () => {
    const s = storyFrom(text(0));
    const facts = s.facts.map((f) => (f.key === 'bowel_pain' ? { ...f, cycleRelation: 'unknown' as const } : f));
    expect(ids(facts)).not.toContain('ENDO-04');
  });

  it('every fired rule exposes why it fired and its source', () => {
    for (const r of firedRules(storyFrom(text(0)).facts)) {
      expect(r.reasonFactIds.length).toBeGreaterThan(0);
      expect(r.source.name).toBeTruthy();
      expect(r.text.length).toBeGreaterThan(10);
    }
  });

  it('ENDO-05 fires with confirmed >=12 months of difficulty conceiving', () => {
    expect(ids(storyFrom(text(7)).facts)).toContain('ENDO-05');
  });

  it('PCOS pack fires on cycle + androgen-related features, with no weight-based input', () => {
    const f = ids(storyFrom(text(2)).facts);
    expect(f).toEqual(['PCOS-01', 'PCOS-02', 'PCOS-03']);
    const triggers = JSON.stringify([...pcosPack.rules, ...endoPack.rules].map((r) => r.when));
    expect(/weight|bmi|obes|overweight|appearance/i.test(triggers)).toBe(false);
  });

  it('a denied symptom (value false) never fires a rule', () => {
    const s = storyFrom(text(0));
    const facts = s.facts.map((f) => (f.key === 'dyspareunia' ? { ...f, value: false } : f));
    expect(ids(facts)).not.toContain('ENDO-03');
  });
});

describe('not yet known + follow-ups', () => {
  it('demo story has a sensible not-yet-known list', () => {
    const s = storyFrom(text(0));
    const keys = computeMissing(s.facts).map((m) => m.key);
    expect(activePathways(s.facts)).toEqual(['endometriosis']);
    expect(keys).toContain('urinary_pain');
    expect(keys).toContain('heavy_bleeding');
    expect(keys).not.toContain('dyspareunia');
    expect(keys).not.toContain('pelvic_pain_duration_months');
  });

  it('asks at most 5 questions and never repeats a skipped one', () => {
    const s = storyFrom(text(0));
    const first = nextFollowups(s.facts, []);
    expect(first.length).toBeLessThanOrEqual(5);
    const again = nextFollowups(s.facts, [first[0].key]);
    expect(again.map((d) => d.key)).not.toContain(first[0].key);
  });

  it('"not sure" stays unknown and is listed as unsure, never turned into a value', () => {
    const s = storyFrom(text(0));
    const def = FOLLOWUPS.find((d) => d.key === 'urinary_pain')!;
    const f = factFromAnswer(def, 'unsure', 'x1');
    expect(f.status).toBe('unknown');
    expect(f.value).toBeNull();
    const missing = computeMissing([...s.facts, f]).find((m) => m.key === 'urinary_pain');
    expect(missing?.unsure).toBe(true);
  });

  it('answers arrive as UNCONFIRMED facts (they go through review)', () => {
    const def = FOLLOWUPS.find((d) => d.key === 'pelvic_pain_severity')!;
    const f = factFromAnswer(def, 7, 'x2');
    expect(f.status).toBe('unconfirmed');
    expect(f.severity0to10).toBe(7);
  });

  it('inverted regularity answer maps to irregular_cycles=false', () => {
    const def = FOLLOWUPS.find((d) => d.key === 'cycle_regularity')!;
    expect(factFromAnswer(def, 'yes', 'x3').value).toBe(false);
    expect(factFromAnswer(def, 'no', 'x4').value).toBe(true);
  });
});
