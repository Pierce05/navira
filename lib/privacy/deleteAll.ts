import { db, resetDbHandle } from '@/lib/db/dexie';

/** Wipes IndexedDB, Cache Storage (model weights only if asked), localStorage and sessionStorage. */
export async function deleteAll(opts: { removeModel?: boolean } = {}): Promise<{ ok: boolean; removed: string[] }> {
  const removed: string[] = [];
  try { await db().delete(); resetDbHandle(); removed.push('IndexedDB'); } catch { /* keep going */ }
  try { localStorage.clear(); sessionStorage.clear(); removed.push('Local settings'); } catch { /* ignore */ }
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  if (typeof caches !== 'undefined') {
    for (const k of await caches.keys()) {
      const isModel = /transformers|onnx|huggingface/i.test(k);
      const isShell = k.startsWith('navira-shell-');
      if (isModel && !opts.removeModel) continue;
      // The shell cache holds only public app files, never user content. If we are offline we cannot fetch it
      // again, so wiping it would leave an app that cannot start. Keep it in that case and say so.
      if (isShell && !online) { removed.push('App files kept (you are offline)'); continue; }
      await caches.delete(k);
      removed.push(isModel ? 'Speech model cache' : `Cache ${k}`);
    }
  }
  if (online && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) {
      await new Promise<void>((resolve) => {
        const ch = new MessageChannel();
        const t = setTimeout(resolve, 15000);
        ch.port1.onmessage = () => { clearTimeout(t); resolve(); };
        reg.active!.postMessage({ type: 'reprecache' }, [ch.port2]); // restore the offline shell (no user data); wait for it
      });
    }
  }
  return { ok: true, removed };
}
