'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Empty } from '@/components/ui';
import { describe, KIND_ORDER, KIND_TITLE } from '@/lib/extract/describe';
import { KEY_NAMES } from '@/lib/rules/names';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import type { CycleRelation, Fact } from '@/lib/db/models';

const CYCLE_KEYS = ['pelvic_pain', 'bowel_pain', 'urinary_pain', 'heavy_bleeding'];
const REL_OPTIONS: [CycleRelation, string][] = [['unknown', 'Not sure'], ['before', 'Before periods'], ['during', 'During periods'], ['after', 'After periods'], ['any', 'Any time']];

function Chip({ f, selected, onSelect, onActive }: { f: Fact; selected: boolean; onSelect: () => void; onActive: (on: boolean) => void }) {
  const { patchFact, removeFact, confirmFacts } = useStore();
  const t = useT();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<string>(f.value === null ? '' : String(f.value));
  const confirmed = f.status === 'confirmed';
  const interp = f.provenance === 'system_interpretation';
  const label = confirmed || f.status === 'unknown' ? describe(f) : f.label ?? describe(f);
  const numeric = typeof f.value === 'number';
  const cyc = f.kind === 'symptom' && CYCLE_KEYS.includes(f.key);

  const saveEdit = () => {
    const value: Fact['value'] = numeric ? (draft === '' ? null : Number(draft)) : draft;
    const next: Partial<Fact> = { value, provenance: 'patient_reported', needsCheck: false, status: 'unconfirmed' };
    if (f.key === 'pelvic_pain_severity' && typeof value === 'number') next.severity0to10 = Math.min(10, Math.max(0, value));
    const merged = { ...f, ...next } as Fact;
    patchFact(f.id, { ...next, label: describe(merged) });
    setEdit(false);
  };

  return (
    <li
      onMouseEnter={() => onActive(true)} onMouseLeave={() => onActive(false)} onFocus={() => onActive(true)} onBlur={() => onActive(false)}
      className={`rounded-2xl border p-4 ${confirmed ? 'border-line bg-surface' : f.needsCheck ? 'border-2 border-accent-strong bg-surface' : 'border-dashed border-line bg-surface'}`}
    >
      <div className="flex items-start gap-3">
        {!confirmed ? (
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select: ${label}`} className="mt-1.5 h-5 w-5 shrink-0 accent-[var(--accent-strong)]" />
        ) : <span aria-hidden="true" className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-ink">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 10.5l4 4 8-9" /></svg></span>}
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-snug">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={interp ? 'system' : 'patient'}>
              <span aria-hidden="true">{interp ? '◇' : '●'}</span>{interp ? t('provSystem') : t('provPatient')}
            </Badge>
            {confirmed ? <Badge tone="plain">Confirmed</Badge> : f.status === 'unknown' ? <Badge tone="plain">Not sure</Badge> : f.needsCheck ? <Badge tone="warn">Please check</Badge> : <Badge tone="plain">To confirm</Badge>}
          </div>
          {f.evidence ? <p className="mt-2 text-sm text-muted">From your words: “{f.evidence}”</p> : null}

          {cyc && !confirmed ? (
            <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">Around your periods?
              <select value={f.cycleRelation ?? 'unknown'} onChange={(e) => patchFact(f.id, { cycleRelation: e.target.value as CycleRelation, needsCheck: false })} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-ink">
                {REL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          ) : null}

          {edit ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`e-${f.id}`}>Edit value</label>
              <input id={`e-${f.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} type={numeric ? 'number' : 'text'} className="min-h-[44px] flex-1 rounded-full border border-line bg-surface px-4 text-ink" />
              <Button onClick={saveEdit}>Save</Button><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {!confirmed ? <Button className="!min-h-[44px]" onClick={() => confirmFacts([f.id])}>Yes, that is right</Button> : <Button variant="secondary" onClick={() => patchFact(f.id, { status: 'unconfirmed' })}>Change my mind</Button>}
            {typeof f.value !== 'boolean' ? <Button variant="secondary" onClick={() => { setDraft(f.value === null ? '' : String(f.value)); setEdit(true); }}>Edit</Button> : null}
            <Button variant="ghost" onClick={() => removeFact(f.id)} aria-label={`Remove: ${label}`}>Remove</Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ReviewBoard() {
  const t = useT();
  const { story, hydrated, confirmAll, confirmFacts, addFact } = useStore();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Fact | null>(null);
  const [addKey, setAddKey] = useState('');
  const [custom, setCustom] = useState('');

  const groups = useMemo(() => KIND_ORDER.map((k) => ({ k, items: (story?.facts ?? []).filter((f) => f.kind === k) })).filter((g) => g.items.length), [story?.facts]);
  if (!hydrated) return <p role="status" className="text-muted">Loading…</p>;
  if (!story || !story.transcript) return <Empty text={t('emptyStory')} />;

  const facts = story.facts;
  const pending = facts.filter((f) => f.status === 'unconfirmed');
  const needCheck = pending.filter((f) => f.needsCheck).length;
  const confirmed = facts.filter((f) => f.status === 'confirmed').length;
  const span = active?.sourceSpan;
  const tx = story.transcript;
  const next = story.followupsDone ? '/timeline/' : '/followups/';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <Card className="mb-5">
          <h2 className="text-2xl">{t('isThisRight')}</h2>
          <p className="mt-1 text-muted">Check each thing we picked up. Only what you confirm goes into your timeline and brief. Anything we could not find stays unknown.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={confirmAll} disabled={!pending.some((f) => !f.needsCheck)}>{t('confirmAll')}</Button>
            <Button variant="secondary" disabled={sel.size === 0} onClick={() => { confirmFacts([...sel]); setSel(new Set()); }}>{t('confirmSelected')} ({sel.size})</Button>
            <p className="text-sm text-muted" role="status">{confirmed} confirmed, {pending.length} still to confirm{needCheck ? `, ${needCheck} marked “Please check”` : ''}</p>
          </div>
          {needCheck ? <p className="mt-3 rounded-2xl border border-line p-3 text-sm">Items marked “Please check” use something we borrowed from context. “Confirm all” skips them so you can look at each one.</p> : null}
        </Card>

        {facts.length === 0 ? (
          <Empty text="We did not pick anything out automatically. That is fine: add what matters below, or go back and add more to your story." />
        ) : groups.map((g) => (
          <section key={g.k} className="mb-6" aria-labelledby={`g-${g.k}`}>
            <h3 id={`g-${g.k}`} className="mb-2 text-xl">{KIND_TITLE[g.k]}</h3>
            <ul className="grid gap-3">
              {g.items.map((f) => (
                <Chip key={f.id} f={f} selected={sel.has(f.id)} onSelect={() => setSel((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })} onActive={(on) => setActive(on ? f : null)} />
              ))}
            </ul>
          </section>
        ))}

        <Card className="mb-6">
          <h3 className="mb-2 text-xl">Add something we missed</h3>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="add-key">What to add</label>
            <select id="add-key" value={addKey} onChange={(e) => setAddKey(e.target.value)} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-ink">
              <option value="">Choose a symptom…</option>
              {Object.entries(KEY_NAMES).filter(([k]) => !facts.some((f) => f.key === k)).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <Button variant="secondary" disabled={!addKey} onClick={() => { addFact({ kind: 'symptom', key: addKey, value: true, provenance: 'patient_reported', label: KEY_NAMES[addKey], cycleRelation: CYCLE_KEYS.includes(addKey) ? 'unknown' : undefined }); setAddKey(''); }}>Add</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="add-note">Something else, in your words</label>
            <input id="add-note" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Something else, in your words" className="min-h-[44px] flex-1 rounded-full border border-line bg-surface px-4 text-ink" />
            <Button variant="secondary" disabled={!custom.trim()} onClick={() => { useStore.getState().scanText(custom); addFact({ kind: 'history', key: `note_${Date.now().toString(36)}`, value: custom.trim(), provenance: 'patient_reported', label: custom.trim() }); setCustom(''); }}>Add note</Button>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/story/" className="inline-flex min-h-[44px] items-center rounded-full border border-line px-5">{t('back')}</Link>
          <Link href={next} className="inline-flex min-h-[44px] items-center rounded-full bg-accent-strong px-6 font-medium text-on-accent">{t('continue')}</Link>
        </div>
        {confirmed === 0 ? <p className="mt-3 text-sm text-muted">Nothing is confirmed yet, so your brief will be empty. You can still continue.</p> : null}
      </div>

      <aside aria-label="Your words" className="lg:sticky lg:top-4 lg:self-start">
        <div className="card-2 p-5">
          <h3 className="mb-2 text-lg">Your words</h3>
          <p className="whitespace-pre-wrap leading-relaxed" lang={story.lang === 'hi' ? 'hi' : undefined}>
            {span ? (<>{tx.slice(0, span[0])}<mark>{tx.slice(span[0], span[1])}</mark>{tx.slice(span[1])}</>) : tx}
          </p>
          <p className="mt-3 text-sm opacity-80">{active ? (span ? 'Highlighted: the words this came from.' : 'This one does not come from specific words.') : 'Hover or focus a card to see where it came from.'}</p>
          {story.synthetic ? <p className="mt-2"><Badge tone="warn">{t('synthetic')}</Badge></p> : null}
        </div>
      </aside>
    </div>
  );
}
