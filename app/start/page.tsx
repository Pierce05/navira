'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, PageTitle } from '@/components/ui';
import { DemoButton } from '@/components/story/DemoButton';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import type { Lang } from '@/lib/db/models';
import { FLOW } from '@/lib/privacy/flow';


export default function Start() {
  const t = useT();
  const router = useRouter();
  const { giveConsent, newStory, story } = useStore();
  const [lang, setLang] = useState<Lang>('hinglish');
  const [ok, setOk] = useState(false);

  return (
    <div className="max-w-3xl">
      <PageTitle title="Before we begin" intro="Here is exactly where your information goes. You are in control the whole way." />

      <Card className="mb-6">
        <h2 className="mb-3 text-xl">Where your information goes</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-[15px]">
            <caption className="sr-only">Data flow</caption>
            <thead><tr className="border-b border-line"><th className="py-2 pr-3 font-medium">What</th><th className="py-2 pr-3 font-medium">What happens</th><th className="py-2 font-medium">Where it goes</th></tr></thead>
            <tbody>{FLOW.map(([a, b, c]) => (
              <tr key={a} className="border-b" style={{ borderColor: 'var(--soft-line)' }}><td className="py-2 pr-3 font-medium">{a}</td><td className="py-2 pr-3">{b}</td><td className="py-2">{c}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">There are no accounts, no analytics and no third-party scripts. The Network indicator in the footer counts requests that could carry your content. It should read 0.</p>
      </Card>

      <Card>
        <fieldset>
          <legend className="mb-3 text-xl font-display font-semibold">Which language will you speak?</legend>
          <div className="flex flex-wrap gap-3">
            {([['en', 'English'], ['hi', 'हिंदी'], ['hinglish', 'Hinglish']] as [Lang, string][]).map(([v, l]) => (
              <label key={v} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 ${lang === v ? 'border-accent-strong bg-surface2' : 'border-line'}`}>
                <input type="radio" name="lang" value={v} checked={lang === v} onChange={() => setLang(v)} className="h-4 w-4 accent-[var(--accent-strong)]" />{l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1.5 h-5 w-5 accent-[var(--accent-strong)]" />
          <span>{t('consent')}</span>
        </label>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={!ok} onClick={() => { giveConsent(); newStory(lang); router.push('/story/'); }}>{t('continue')}</Button>
          <DemoButton />
        </div>
        {story && story.transcript ? <p className="mt-4 text-sm text-muted">Starting again replaces the story saved on this device.</p> : null}
      </Card>
    </div>
  );
}
