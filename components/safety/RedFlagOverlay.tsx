'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, LinkButton } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { EMERGENCY } from '@/lib/rules/redflags';

/** Full-screen, calm interrupt. Rule-based and offline. It is never a diagnosis. */
export function RedFlagOverlay() {
  const hits = useStore((s) => s.interrupt);
  const resolve = useStore((s) => s.resolveInterrupt);
  const router = useRouter();
  const t = useT();
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (hits) first.current?.focus(); }, [hits]);
  if (!hits) return null;
  const selfHarm = hits.some((h) => h.category === 'selfharm');
  const urgent = hits.some((h) => h.category === 'urgent');

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="rf-title" aria-describedby="rf-body" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/95 p-4">
      <div className="card w-full max-w-xl p-6 sm:p-9">
        <h2 id="rf-title" className="text-2xl sm:text-3xl">{selfHarm && !urgent ? 'You do not have to carry this alone.' : 'What you have described can need prompt medical attention.'}</h2>
        <div id="rf-body" className="mt-4 space-y-3 text-lg">
          {urgent ? (
            <p>Please contact a doctor or the nearest emergency service now ({EMERGENCY.national} in India). Your story will be here when you are ready.</p>
          ) : null}
          {selfHarm ? (
            <p>
              If you are thinking about harming yourself, please reach out to someone now. In India you can call Tele-MANAS on <strong>{EMERGENCY.teleManas}</strong>, or {EMERGENCY.national} in an emergency. You can also tell someone you trust where you are.
            </p>
          ) : null}
          {selfHarm ? <p className="text-base">Both numbers: <strong>{EMERGENCY.national}</strong> (emergency) and <strong>{EMERGENCY.teleManas}</strong> (Tele-MANAS). Please check these numbers are current in your area.</p> : null}
          <p className="text-muted">Navira cannot assess this for you. It is not a diagnosis.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a ref={first} href={`tel:${EMERGENCY.national}`} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent-strong px-6 py-2 font-medium text-on-accent">{t('call112')}</a>
          {selfHarm ? <LinkButton href={`tel:${EMERGENCY.teleManas}`} variant="secondary">Call {EMERGENCY.teleManas}</LinkButton> : null}
          <Button variant="secondary" onClick={async () => { await resolve('continue_later'); router.push('/'); }}>{t('continueLater')}</Button>
          <Button variant="ghost" onClick={() => resolve('dismissed')}>{t('notUrgent')}</Button>
        </div>
        <p className="mt-5 text-sm text-muted">More guidance on the <a className="underline" href="/safety/" onClick={() => void resolve('dismissed')}>urgent help page</a>.</p>
      </div>
    </div>
  );
}
