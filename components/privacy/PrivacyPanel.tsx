'use client';
import { useRef, useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useNet } from '@/components/privacy/NetPill';
import { resetNetCounts } from '@/lib/privacy/netmonitor';
import { deleteAll } from '@/lib/privacy/deleteAll';
import { buildExport, importBundle, isEncrypted } from '@/lib/privacy/exportImport';
import { FLOW } from '@/lib/privacy/flow';
import { PACKS } from '@/lib/rules/engine';
import { REDFLAG_RULES_VERSION } from '@/lib/rules/redflags';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';

export function PrivacyPanel() {
  const t = useT();
  const net = useNet();
  const [confirmDel, setConfirmDel] = useState(false);
  const [removeModel, setRemoveModel] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [ipass, setIpass] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const wipe = async () => {
    const r = await deleteAll({ removeModel });
    useStore.getState().resetSession();
    setConfirmDel(false);
    setDone(`Erased: ${r.removed.join(', ') || 'nothing was stored'}. This device now holds none of your story.`);
  };
  const doExport = async () => {
    const data = await buildExport(pass || undefined);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `navira-data-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setExporting(false); setPass(''); setMsg(pass ? 'Exported and locked with your passphrase.' : 'Exported. This file is not locked: anyone with it can read your story.');
  };
  const tryImport = async (text: string, p?: string) => {
    try { const n = await importBundle(text, p); setPending(null); setIpass(''); setMsg(`Imported ${n} ${n === 1 ? 'story' : 'stories'}. Reload to see it.`); }
    catch { setMsg(isEncrypted(text) ? 'That passphrase did not work, or the file is damaged.' : 'That file is not a Navira export.'); }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="text-2xl">What happens to your information</h2>
        <p className="mt-1 text-lg">Your voice and story are processed and stored on this device.</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-[15px]">
          <caption className="sr-only">Data flow</caption>
          <thead><tr className="border-b border-line"><th className="py-2 pr-3 font-medium">What</th><th className="py-2 pr-3 font-medium">What happens</th><th className="py-2 font-medium">Where it goes</th></tr></thead>
          <tbody>{FLOW.map(([a, b, c]) => <tr key={a} className="border-b" style={{ borderColor: 'var(--soft-line)' }}><td className="py-2 pr-3 font-medium">{a}</td><td className="py-2 pr-3">{b}</td><td className="py-2">{c}</td></tr>)}</tbody>
        </table></div>
        <p className="mt-3 text-sm text-muted">No accounts. No analytics. No third-party scripts. Fonts and speech-engine files are served from this app itself. The only outside download is the speech model, once.</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">{t('network')}: what left your device</h2>
          <Badge tone={net.userContent === 0 ? 'patient' : 'warn'}>{net.userContent === 0 ? 'Mode A: nothing carrying your content' : 'Check this'}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="card-2 p-4"><dt className="text-sm">Requests that could carry your content</dt><dd className="font-display text-4xl" aria-live="polite">{net.userContent}</dd></div>
          <div className="card-2 p-4"><dt className="text-sm">App files from this site</dt><dd className="font-display text-4xl">{net.assets}</dd></div>
          <div className="card-2 p-4"><dt className="text-sm">Speech model downloads (disclosed)</dt><dd className="font-display text-4xl">{net.modelWeights}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-muted">Counted: any request that sends data, any request to another site, and any beacon or socket. App files and model files are only downloaded, never uploaded. Try it: after the first load, switch on airplane mode and complete the whole flow.</p>
        <details className="mt-2 text-sm"><summary className="min-h-[44px] cursor-pointer py-2">Recent requests</summary>
          {net.log.length === 0 ? <p className="text-muted">None yet.</p> : <ul className="max-h-48 overflow-auto font-mono text-xs">{net.log.slice(-15).reverse().map((e, i) => <li key={i}>{e.kind} {e.method} {e.target}</li>)}</ul>}
        </details>
        <Button variant="secondary" className="mt-2" onClick={resetNetCounts}>Reset counters</Button>
        <fieldset className="mt-5"><legend className="font-medium">Mode</legend>
          <label className="flex min-h-[44px] items-center gap-2"><input type="radio" checked readOnly className="h-4 w-4 accent-[var(--accent-strong)]" />Mode A: fully on this device (default)</label>
          <label className="flex min-h-[44px] items-center gap-2 text-muted"><input type="radio" disabled className="h-4 w-4" />Mode B: assisted, with your consent each session. Not built yet.</label>
        </fieldset>
      </Card>

      <Card>
        <h2 className="text-2xl">Take your data with you</h2>
        <p className="mt-1 text-muted">Export makes a file on this device. Only you decide where it goes.</p>
        {!exporting ? <Button className="mt-3" onClick={() => setExporting(true)}>Export my data</Button> : (
          <div role="group" aria-label="Export consent" className="mt-3 rounded-2xl border border-line p-4">
            <p>This creates a file containing your story and confirmed facts. Anyone who has the file can read it unless you set a passphrase.</p>
            <label className="mt-3 block text-sm">Passphrase (optional)<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="mt-1 block min-h-[44px] w-full max-w-xs rounded-full border border-line bg-surface px-4 text-ink" /></label>
            <div className="mt-3 flex gap-2"><Button onClick={doExport}>Yes, create the file</Button><Button variant="ghost" onClick={() => setExporting(false)}>Cancel</Button></div>
          </div>
        )}
        <div className="mt-4">
          <input ref={file} type="file" accept="application/json" className="sr-only" aria-label="Import a Navira export" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const text = await f.text(); isEncrypted(text) ? setPending(text) : void tryImport(text); e.target.value = ''; }} />
          <Button variant="secondary" onClick={() => file.current?.click()}>Import from a file</Button>
        </div>
        {pending ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-sm">Passphrase for this file<input type="password" value={ipass} onChange={(e) => setIpass(e.target.value)} className="mt-1 block min-h-[44px] rounded-full border border-line bg-surface px-4 text-ink" /></label>
            <Button onClick={() => void tryImport(pending, ipass)}>Unlock and import</Button>
          </div>
        ) : null}
        {msg ? <p role="status" className="mt-3 rounded-2xl border border-line p-3">{msg}</p> : null}
      </Card>

      <Card id="delete">
        <h2 className="text-2xl">{t('deleteAll')}</h2>
        <p className="mt-1">{t('deleteWarn')}</p>
        {!confirmDel ? <Button variant="danger" className="mt-3" onClick={() => { setDone(null); setConfirmDel(true); }}>{t('deleteAll')}</Button> : (
          <div role="alertdialog" aria-label="Confirm delete" className="mt-3 rounded-2xl border-2 border-danger p-4">
            <p className="font-medium">{t('deleteWarn')}</p>
            <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={removeModel} onChange={(e) => setRemoveModel(e.target.checked)} className="h-5 w-5 accent-[var(--accent-strong)]" />Also remove the downloaded speech model (it will need downloading again)</label>
            <div className="mt-3 flex gap-2"><Button variant="danger" onClick={wipe}>Yes, erase everything</Button><Button variant="ghost" onClick={() => setConfirmDel(false)}>Keep my data</Button></div>
          </div>
        )}
        {done ? <p role="status" className="mt-3 rounded-2xl border border-line p-3">{done}</p> : null}
      </Card>

      <Card>
        <h2 className="text-2xl">About the rules</h2>
        <p className="mt-1 text-muted">The rules behind “features commonly considered in evaluation” and the urgent-care checks are drafts based on published guidance.</p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          {PACKS.map((p) => <li key={p.pack}>{p.pack}: version {p.version}, status {p.reviewStatus}</li>)}
          <li>urgent-care checks: version {REDFLAG_RULES_VERSION}, status draft</li>
        </ul>
        <p className="mt-3 font-medium">Rules reviewed by: [pending]</p>
      </Card>
    </div>
  );
}
