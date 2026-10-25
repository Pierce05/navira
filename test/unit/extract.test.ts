import { describe, expect, it } from 'vitest';
import narratives from '../narratives/narratives.json';
import { extractFacts } from '@/lib/extract/lexicon';
import { parseApproxDate, parseCycleLength, parseDaysPerMonth, parseDurationMonths, parseSeverityNumeric, parseSeverityWords } from '@/lib/extract/parsers';

interface Exp { key: string; value?: string | number; cycle?: string }
interface Narr { name: string; text: string; expect: Exp[]; mustNot: string[] }

describe('extraction accuracy on scripted narratives (after simulated confirmation)', () => {
  it('reaches >=85% key-field accuracy and prints a table', () => {
    const rows: Record<string, string | number>[] = [];
    let ok = 0, total = 0;
    for (const n of narratives as Narr[]) {
      const facts = extractFacts(n.text);
      let nOk = 0, nTotal = 0;
      const misses: string[] = [];
      const check = (cond: boolean, what: string) => { nTotal++; if (cond) nOk++; else misses.push(what); };
      for (const e of n.expect) {
        const f = facts.find((x) => x.key === e.key);
        check(!!f, `${e.key}`);
        if (e.value !== undefined) check(f?.value === e.value, `${e.key}=${e.value} (got ${f?.value})`);
        if (e.cycle !== undefined) check(f?.cycleRelation === e.cycle, `${e.key}.cycle=${e.cycle} (got ${f?.cycleRelation})`);
      }
      for (const k of n.mustNot) check(!facts.some((x) => x.key === k), `unexpected ${k}`);
      ok += nOk; total += nTotal;
      rows.push({ narrative: n.name, correct: `${nOk}/${nTotal}`, accuracy: `${Math.round((100 * nOk) / nTotal)}%`, misses: misses.join('; ') });
    }
    // eslint-disable-next-line no-console
    console.table(rows);
    console.log(`OVERALL ${ok}/${total} = ${((100 * ok) / total).toFixed(1)}%`);
    expect(ok / total).toBeGreaterThanOrEqual(0.85);
  });

  it('never marks anything confirmed and never invents a value', () => {
    for (const n of narratives as Narr[]) {
      for (const f of extractFacts(n.text)) {
        expect(f.status).toBe('unconfirmed');
        expect(n.text.length).toBeGreaterThan(0);
        if (f.sourceSpan) expect(f.sourceSpan[1]).toBeGreaterThan(f.sourceSpan[0]);
      }
    }
  });

  it('flags borrowed or interpreted facts for one-by-one checking', () => {
    const facts = extractFacts((narratives as Narr[])[0].text);
    const bowel = facts.find((f) => f.key === 'bowel_pain')!;
    const sev = facts.find((f) => f.key === 'pelvic_pain_severity')!;
    expect(bowel.needsCheck).toBe(true);
    expect(sev.needsCheck).toBe(true);
    expect(sev.provenance).toBe('system_interpretation');
  });
});

describe('parsers', () => {
  it('severity', () => {
    expect(parseSeverityNumeric('pain is 8/10')?.value).toBe(8);
    expect(parseSeverityNumeric('7 out of 10')?.value).toBe(7);
    expect(parseSeverityNumeric('15/10')).toBeNull();
    expect(parseSeverityWords('bahut zyada dard')?.value.suggested).toBe(8);
    expect(parseSeverityWords('thoda aaram milta hai')).toBeNull();
  });
  it('duration to months', () => {
    expect(parseDurationMonths('do saal se')?.value).toBe(24);
    expect(parseDurationMonths('for 2 years')?.value).toBe(24);
    expect(parseDurationMonths('6 mahine se')?.value).toBe(6);
    expect(parseDurationMonths('three months')?.value).toBe(3);
    expect(parseDurationMonths('no number here')).toBeNull();
  });
  it('number words must be whole words: "eighteen" is never read as "teen" = 3', () => {
    expect(parseDurationMonths('for about eighteen months')).toBeNull(); // unsupported word: unknown, not wrong
    expect(parseDurationMonths('doctor months')).toBeNull();
    expect(parseDurationMonths('three months')?.value).toBe(3);
    expect(parseDurationMonths('teen saal se')?.value).toBe(36);
  });
  it('days per month stays as text and is not averaged', () => {
    expect(parseDaysPerMonth('month mein do-teen din')?.value).toBe('2–3');
    expect(parseDaysPerMonth('2 days a month')?.value).toBe('2');
    expect(parseDaysPerMonth('nothing')).toBeNull();
  });
  it('approximate dates keep the words and only bound what is pinned down', () => {
    const now = new Date('2026-10-24T00:00:00Z');
    expect(parseApproxDate('around Diwali 2024', now)).toEqual({ text: 'Diwali 2024', earliest: '2024-10-01', latest: '2024-11-30' });
    expect(parseApproxDate('since March 2024', now)?.earliest).toBe('2024-03-01');
    expect(parseApproxDate('since March 2024', now)?.latest).toBe('2024-03-31');
    expect(parseApproxDate('last year', now)?.earliest).toBe('2025-01-01');
    const grade = parseApproxDate('since 12th grade', now)!;
    expect(grade.text).toMatch(/12th/);
    expect(grade.earliest).toBeUndefined();
    expect(parseApproxDate('sometime', now)).toBeNull();
  });
  it('cycle length', () => {
    expect(parseCycleLength('40 din ka cycle')?.value).toBe(40);
    expect(parseCycleLength('every 45 days')?.value).toBe(45);
    expect(parseCycleLength('3 din ka gap')?.value).toBeUndefined();
  });
});
