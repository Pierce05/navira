'use client';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Empty } from '@/components/ui';
import { BriefPreview } from './BriefPreview';
import { buildBriefModel, suggestQuestions } from '@/lib/brief/model';
import { splitSentences } from '@/lib/extract/lexicon';
import { evaluateRules, RULES_VERSION } from '@/lib/rules/engine';
import { db } from '@/lib/db/dexie';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';

export function BriefEditor() {
  const t = useT();
  const { story, hydrated, questions, notes, initials, excerpt, includeSafety, flagLog, setBriefFields, scanText } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const facts = story?.facts;
  const results = useMemo(() => evaluateRules(facts ?? []), [facts]);
  const sentences = useMemo(() => splitSentences(story?.transcript ?? ''), [story?.transcript]);

  useEffect(() => {
    if (hydrated && story && questions === null) setBriefFields({ questions: suggestQuestions(story.facts, results) });
  }, [hydrated, story, questions, results, setBriefFields]);
  useEffect(() => {
    if (hydrated && story && excerpt === null && sentences.length) setBriefFields({ excerpt: sentences.slice(0, 2).map((s) => s.text.trim()).join(' ') });
  }, [hydrated, story, excerpt, sentences, setBriefFields]);

  const model = useMemo(() => story ? buildBriefModel({
    story, results, questions: questions ?? undefined, notes: notes.trim() || undefined, includeSafety,
    safetyLabels: flagLog.map((f) => f.label), initials: initials.trim() || undefined, excerpt: excerpt ?? '',
  }) : null, [story, results, questions, notes, includeSafety, flagLog, initials, excerpt]);

  if (!hydrated) return <p role="status" className="text-muted">Loading…</p>;
  if (!story || !model) return <Empty text={t('emptyStory')} />;
  const confirmedCount = story.facts.filter((f) => f.status === 'confirmed').length;
  const qs = questions ?? [];

  const download = async () => {
    setBusy(true); setMsg(null);
    try {
      const [{ pdf }, { briefElement }, { registerBriefFonts }] = await Promise.all([
        import('@react-pdf/renderer'), import('@/lib/brief/BriefDocument'), import('@/lib/brief/fonts'),
      ]);
      registerBriefFonts('/fonts');
      const blob = await pdf(briefElement(model)).toBlob();
      const raw = new TextDecoder('latin1').decode(await blob.arrayBuffer());
      const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `navira-brief-${model.generatedOn}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await db().briefs.put({ id: `b${Date.now()}`, storyIds: [story.id], generatedAt: new Date().toISOString(), rulesVersion: RULES_VERSION, notes: notes || undefined, questions: qs }).catch(() => undefined);
      setMsg(pages > 1 ? 'Your brief spilled onto a second page. Shorten your notes or questions to fit one page.' : 'Downloaded. It is a single page, and the text can be selected and searched.');
    } catch {
      setMsg('The PDF could not be made on this device. You can still use Print and choose “Save as PDF”.');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="grid content-start gap-5">
        {confirmedCount === 0 ? <Card><p>Nothing is confirmed yet, so the brief is mostly empty. Confirm what we picked up on the review screen first.</p></Card> : null}
        <Card>
          <h2 className="text-xl">In my words</h2>
          <p className="mb-2 text-sm text-muted">Choose the lines that show it best.</p>
          <ul className="grid gap-1">
            {sentences.map((s, i) => {
              const txt = s.text.trim();
              const on = (excerpt ?? '').includes(txt);
              return (
                <li key={i}><label className="flex min-h-[44px] cursor-pointer items-start gap-2 py-1">
                  <input type="checkbox" checked={on} className="mt-1.5 h-5 w-5 accent-[var(--accent-strong)]" onChange={() => {
                    const chosen = sentences.map((x) => x.text.trim()).filter((x, j) => (j === i ? !on : (excerpt ?? '').includes(x)));
                    setBriefFields({ excerpt: chosen.join(' ') });
                  }} /><span className="deva">{txt}</span></label></li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl">Questions I would like to discuss</h2>
          <p className="mb-2 text-sm text-muted">Suggested from what is not yet known. Change them freely. Up to 5.</p>
          <ol className="grid gap-2">
            {qs.map((q, i) => (
              <li key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={`q${i}`}>Question {i + 1}</label>
                <textarea id={`q${i}`} value={q} rows={2} onChange={(e) => { const n = [...qs]; n[i] = e.target.value; setBriefFields({ questions: n }); scanText(e.target.value); }} className="flex-1 rounded-2xl border border-line bg-surface p-2 text-ink" />
                <Button variant="ghost" aria-label={`Remove question ${i + 1}`} onClick={() => setBriefFields({ questions: qs.filter((_, j) => j !== i) })}>Remove</Button>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={qs.length >= 5} onClick={() => setBriefFields({ questions: [...qs, ''] })}>Add a question</Button>
            <Button variant="ghost" onClick={() => setBriefFields({ questions: suggestQuestions(story.facts, results) })}>Reset suggestions</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl">Extras</h2>
          <label className="mt-2 block text-sm">Initials (optional)
            <input value={initials} maxLength={4} onChange={(e) => setBriefFields({ initials: e.target.value })} className="mt-1 block min-h-[44px] w-24 rounded-full border border-line bg-surface px-4 text-ink" />
          </label>
          <label className="mt-3 block text-sm">My notes (optional, up to 240 characters)
            <textarea value={notes} maxLength={240} rows={3} onChange={(e) => { setBriefFields({ notes: e.target.value }); scanText(e.target.value); }} className="mt-1 block w-full rounded-2xl border border-line bg-surface p-2 text-ink" />
          </label>
          {flagLog.length ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" checked={includeSafety} onChange={(e) => setBriefFields({ includeSafety: e.target.checked })} className="mt-1 h-5 w-5 accent-[var(--accent-strong)]" />
              <span>Include a short safety note, because urgent-care guidance was shown during this story. You choose.</span>
            </label>
          ) : null}
        </Card>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button onClick={download} disabled={busy}>{busy ? 'Making your PDF…' : t('downloadPdf')}</Button>
          <Button variant="secondary" onClick={() => window.print()}>{t('print')}</Button>
          {story.synthetic ? <Badge tone="warn">{t('synthetic')}</Badge> : null}
        </div>
        {msg ? <p role="status" className="mb-4 rounded-2xl border border-line p-3">{msg}</p> : null}
        <BriefPreview m={model} />
        <p className="mx-auto mt-3 max-w-[794px] text-sm text-muted">The preview and the PDF come from the same content: one A4 page, readable in black and white.</p>
      </div>
    </div>
  );
}
