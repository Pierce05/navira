import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

// stand-ins for the browser pieces deleteAll touches
const mem = new Map<string, string>();
const cacheNames = new Set<string>();
let posted: unknown[] = [];
let online = true;

function installBrowser() {
  Object.assign(globalThis, {
    localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
    sessionStorage: { clear: () => undefined },
    caches: { keys: async () => [...cacheNames], delete: async (k: string) => cacheNames.delete(k) },
  });
  const nav = {
    get onLine() { return online; },
    serviceWorker: { getRegistration: async () => ({ active: { postMessage: (m: unknown, ports?: MessagePort[]) => { posted.push(m); ports?.[0]?.postMessage('done'); /* the real SW replies when its precache finishes */ } } }) },
  };
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
}

beforeEach(() => {
  mem.clear(); cacheNames.clear(); posted = []; online = true;
  ['navira-shell-abc1234567', 'transformers-cache', 'other-cache'].forEach((c) => cacheNames.add(c));
  installBrowser();
});

async function run(opts: { removeModel?: boolean } = {}) {
  const { db } = await import('@/lib/db/dexie');
  await db().stories.put({ id: 's', createdAt: 'x', lang: 'en', transcript: 'private words', facts: [], askedKeys: [], followupsDone: false });
  mem.set('navira.theme', 'dark'); mem.set('navira.consent', '1');
  const { deleteAll } = await import('@/lib/privacy/deleteAll');
  return deleteAll(opts);
}

describe('deleteAll()', () => {
  it('empties IndexedDB and localStorage, removes the shell cache, keeps the model cache by default, and waits for the SW to re-precache', async () => {
    const res = await run();
    expect(res.ok).toBe(true);
    expect(posted.some((m) => (m as { type: string }).type === 'reprecache')).toBe(true);
    expect(mem.size).toBe(0);
    expect(cacheNames.has('transformers-cache')).toBe(true);
    expect(cacheNames.has('navira-shell-abc1234567')).toBe(false);
    expect(cacheNames.has('other-cache')).toBe(false);
    const { db } = await import('@/lib/db/dexie');
    expect(await db().stories.count()).toBe(0);
  });

  it('removes the speech model cache only when asked', async () => {
    await run({ removeModel: true });
    expect(cacheNames.has('transformers-cache')).toBe(false);
  });

  it('when OFFLINE it keeps the app shell (it cannot be re-fetched) but still erases all user data', async () => {
    online = false;
    const res = await run();
    expect(res.removed.join(' ')).toMatch(/App files kept/);
    expect(cacheNames.has('navira-shell-abc1234567')).toBe(true);
    expect(mem.size).toBe(0);
    const { db } = await import('@/lib/db/dexie');
    expect(await db().stories.count()).toBe(0);
    expect(posted).toEqual([]); // nothing to re-precache while offline
  });
});
