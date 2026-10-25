import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';

// minimal browser stand-ins for the store / delete-all code paths
const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
  sessionStorage: { clear: () => undefined },
});

let useStore: typeof import('@/lib/store').useStore;
let db: typeof import('@/lib/db/dexie').db;
beforeAll(async () => { ({ useStore } = await import('@/lib/store')); ({ db } = await import('@/lib/db/dexie')); });

import { firedRules } from '@/lib/rules/engine';
import { DEMO_REDFLAG_LINE } from '@/lib/demo';

describe('end-to-end flow through the real store and IndexedDB (no UI)', () => {
  it('demo story: extract -> nothing flows until confirmed -> confirm -> ENDO-01/02/03/04 -> persisted', async () => {
    const s = () => useStore.getState();
    s().loadDemo();
    expect(s().story?.synthetic).toBe(true);
    await s().extract();
    expect(s().story!.facts.length).toBeGreaterThan(6);
    expect(firedRules(s().story!.facts)).toHaveLength(0); // unconfirmed facts never flow

    s().confirmAll(); // skips needsCheck items on purpose
    const stillCheck = s().story!.facts.filter((f) => f.needsCheck);
    expect(stillCheck.map((f) => f.key).sort()).toEqual(['bowel_pain', 'pelvic_pain_severity']);
    expect(firedRules(s().story!.facts).map((r) => r.ruleId)).not.toContain('ENDO-04'); // needs the person's deliberate confirm

    s().confirmFacts(stillCheck.map((f) => f.id));
    const ids = firedRules(s().story!.facts).map((r) => r.ruleId);
    for (const id of ['ENDO-01', 'ENDO-02', 'ENDO-03', 'ENDO-04']) expect(ids).toContain(id);

    await s().persist();
    const saved = await db().stories.get(s().story!.id);
    expect(saved?.facts.filter((f) => f.status === 'confirmed').length).toBeGreaterThan(6);
  });

  it('red flag in a note interrupts, can be logged as dismissed, and is remembered for the brief', async () => {
    const s = () => useStore.getState();
    const hits = s().scanText(DEMO_REDFLAG_LINE);
    expect(hits.length).toBeGreaterThan(0);
    expect(s().interrupt).not.toBeNull();
    await s().resolveInterrupt('dismissed');
    expect(s().interrupt).toBeNull();
    expect(s().flagLog.length).toBeGreaterThan(0);
    expect((await db().interruptions.toArray()).length).toBeGreaterThan(0);
    s().scanText(DEMO_REDFLAG_LINE); // same flag again does not re-interrupt after "not urgent"
    expect(s().interrupt).toBeNull();
  });

  it('delete-all wipes the database and local settings', async () => {
    const { deleteAll } = await import('@/lib/privacy/deleteAll');
    mem.set('navira.theme', 'dark');
    const r = await deleteAll();
    expect(r.ok).toBe(true);
    expect(mem.size).toBe(0);
    const { db: fresh } = await import('@/lib/db/dexie');
    expect(await fresh().stories.count()).toBe(0);
    expect(await fresh().interruptions.count()).toBe(0);
  });
});
