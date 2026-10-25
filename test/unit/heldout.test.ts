import { describe, expect, it } from 'vitest';
import dev from '../narratives/narratives.json';
import held from '../narratives/heldout.json';
import { extractFacts } from '@/lib/extract/lexicon';

interface Exp { key: string; value?: string | number; cycle?: string }
interface Narr { name: string; text: string; expect: Exp[]; mustNot: string[] }

function score(set: Narr[]) {
  const rows: Record<string, string>[] = [];
  let ok = 0, total = 0;
  for (const n of set) {
    const facts = extractFacts(n.text);
    let nOk = 0, nTotal = 0;
    const misses: string[] = [];
    const check = (c: boolean, what: string) => { nTotal++; if (c) nOk++; else misses.push(what); };
    for (const e of n.expect) {
      const f = facts.find((x) => x.key === e.key);
      check(!!f, e.key);
      if (e.value !== undefined) check(f?.value === e.value, `${e.key}=${e.value} (got ${f?.value ?? 'none'})`);
      if (e.cycle !== undefined) check(f?.cycleRelation === e.cycle, `${e.key}.cycle=${e.cycle} (got ${f?.cycleRelation ?? 'none'})`);
    }
    for (const k of n.mustNot) check(!facts.some((x) => x.key === k), `unexpected ${k}`);
    ok += nOk; total += nTotal;
    rows.push({ narrative: n.name, correct: `${nOk}/${nTotal}`, misses: misses.join('; ') });
  }
  return { rows, ok, total };
}

describe('extraction accuracy, reported separately', () => {
  it('DEVELOPMENT set (written alongside the lexicon: optimistic) vs HELD-OUT set (written afterwards)', () => {
    const d = score(dev as Narr[]);
    const h = score(held as Narr[]);
    console.log('\nDEVELOPMENT SET'); console.table(d.rows);
    console.log(`development: ${d.ok}/${d.total} = ${((100 * d.ok) / d.total).toFixed(1)}%`);
    console.log('\nHELD-OUT SET'); console.table(h.rows);
    console.log(`held-out: ${h.ok}/${h.total} = ${((100 * h.ok) / h.total).toFixed(1)}%`);
    // This is a measurement, not a gate: the held-out number is reported, never tuned to.
    expect(d.total).toBeGreaterThan(50);
    expect(h.total).toBeGreaterThan(20);
    expect((held as Narr[]).length).toBe(5);
  });
});
