'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, Empty } from '@/components/ui';
import { factFromAnswer, nextFollowups, type FollowupDef } from '@/lib/rules/followups';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';

/** At most 5 plain-language questions. Every one is skippable and "I'm not sure" is always there. */
export function FollowupFlow() {
  const t = useT();
  const router = useRouter();
  const { story, hydrated, uiLang, addAnswerFacts, markAsked, finishFollowups } = useStore();
  const [qs, setQs] = useState<FollowupDef[] | null>(null);
  const [i, setI] = useState(0);
  const [num, setNum] = useState('');

  useEffect(() => { if (hydrated && story && qs === null) setQs(nextFollowups(story.facts, story.askedKeys)); }, [hydrated, story, qs]);

  if (!hydrated || qs === null) return story === null && hydrated ? <Empty text={t('emptyStory')} /> : <p role="status" className="text-muted">Loading…</p>;

  const done = i >= qs.length;
  const finish = (toReview: boolean) => { finishFollowups(); router.push(toReview ? '/review/' : '/timeline/'); };

  if (qs.length === 0 || done) {
    const answered = story!.facts.some((f) => f.status === 'unconfirmed');
    return (
      <Card className="max-w-2xl">
        <h2 className="text-2xl">{qs.length === 0 ? 'No more questions for now.' : 'That is all the questions.'}</h2>
        <p className="mt-2 text-muted">{answered ? 'Your answers are waiting for you to confirm, the same way as before.' : 'Your timeline and brief are ready to look at.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {answered ? <Button onClick={() => finish(true)}>Review your answers</Button> : null}
          <Button variant={answered ? 'secondary' : 'primary'} onClick={() => finish(false)}>See my timeline</Button>
        </div>
      </Card>
    );
  }

  const q = qs[i];
  const text = uiLang === 'hi' ? q.hi : q.en;
  const answer = (a: string | number | 'unsure') => {
    markAsked(q.key);
    if (a !== 'skip') addAnswerFacts([factFromAnswer(q, a as string | number, `fu${Date.now().toString(36)}${i}`)]);
    setNum(''); setI(i + 1);
  };
  const skip = () => { markAsked(q.key); setNum(''); setI(i + 1); };
  const ob = 'min-h-[44px] rounded-full border border-line bg-surface px-5 text-ink hover:bg-surface2';

  return (
    <Card className="max-w-2xl" aria-live="polite">
      <p className="text-sm text-muted">Question {i + 1} of {qs.length}. You can skip any of them.</p>
      <h2 className="mt-2 text-2xl leading-snug" lang={uiLang}>{text}</h2>
      <div className="mt-5 flex flex-wrap gap-3">
        {q.type === 'yesno' ? (<>
          <button className={ob} onClick={() => answer('yes')}>Yes</button><button className={ob} onClick={() => answer('no')}>No</button>
        </>) : null}
        {q.type === 'choice' ? q.options!.map((o) => <button key={o.value} className={ob} onClick={() => answer(o.value)}>{uiLang === 'hi' ? o.hi : o.en}</button>) : null}
        {q.type === 'scale' ? Array.from({ length: 11 }, (_, n) => <button key={n} className={`${ob} !px-0 w-11`} onClick={() => answer(n)} aria-label={`${n} out of 10`}>{n}</button>) : null}
        {q.type === 'number' ? (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (num !== '') answer(Number(num)); }}>
            <label className="sr-only" htmlFor="num">Number{q.unit ? ` of ${q.unit}` : ''}</label>
            <input id="num" type="number" min={q.min} max={q.max} value={num} onChange={(e) => setNum(e.target.value)} className="min-h-[44px] w-32 rounded-full border border-line bg-surface px-4 text-ink" />
            <Button disabled={num === ''} type="submit">Save</Button>
          </form>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 border-t pt-4" style={{ borderColor: 'var(--soft-line)' }}>
        <Button variant="secondary" onClick={() => { markAsked(q.key); answer('unsure'); }}>{t('notSure')}</Button>
        <Button variant="ghost" onClick={skip}>{t('skipQ')}</Button>
      </div>
    </Card>
  );
}
