'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RedFlagOverlay } from '@/components/safety/RedFlagOverlay';
import { NetPill } from '@/components/privacy/NetPill';
import { installNetMonitor } from '@/lib/privacy/netmonitor';
import { useStore, type Theme } from '@/lib/store';
import { useT } from '@/lib/useT';

const NAV = [
  ['/story/', 'navStory'], ['/review/', 'navReview'], ['/timeline/', 'navTimeline'], ['/brief/', 'navBrief'], ['/privacy/', 'navPrivacy'], ['/learn/', 'navLearn'],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { uiLang, setUiLang, theme, setTheme, hydrate } = useStore();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    installNetMonitor();
    void hydrate();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Only a page that was already under a service worker is "updated"; the very first install is not.
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) setUpdateReady(true); });
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [hydrate]);
  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-on-accent">{t('skip')}</a>
      <header className="border-b border-soft-line" style={{ borderColor: 'var(--soft-line)' }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <Link href="/" className="mr-2 inline-flex min-h-[44px] items-center font-display text-2xl font-semibold text-ink">Navira</Link>
          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
            {NAV.map(([href, k]) => (
              <Link key={href} href={href} className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-3 text-[15px] text-ink hover:bg-surface2">{t(k)}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <label className="sr-only" htmlFor="theme">{t('theme')}</label>
            <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-sm text-ink">
              <option value="system">{t('themeSystem')}</option><option value="light">{t('themeLight')}</option><option value="dark">{t('themeDark')}</option>
            </select>
            <div role="group" aria-label={t('language')} className="flex overflow-hidden rounded-full border border-line">
              {(['en', 'hi'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setUiLang(l)} aria-pressed={uiLang === l} className={`min-h-[44px] min-w-[44px] px-3 text-sm ${uiLang === l ? 'bg-accent-strong text-on-accent' : 'bg-surface text-ink'}`}>{l === 'en' ? 'EN' : 'हिंदी'}</button>
              ))}
            </div>
            <Link href="/safety/" className="inline-flex min-h-[44px] items-center rounded-full border-2 border-danger px-3 text-sm font-medium text-danger">{t('urgent')}</Link>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</main>
      <footer className="mt-12 border-t" style={{ borderColor: 'var(--soft-line)' }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 text-sm">
          <p className="flex-1 text-muted">{t('notDx')}</p>
          <NetPill />
          <Link href="/privacy/#delete" className="inline-flex min-h-[44px] items-center text-accent-strong underline underline-offset-4">{t('deleteAll')}</Link>
        </div>
      </footer>
      {updateReady ? (
        <div role="status" className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow">
          <span>Update ready.</span>
          <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] rounded-full bg-accent-strong px-4 font-medium text-on-accent">Reload</button>
          <button type="button" onClick={() => setUpdateReady(false)} className="min-h-[44px] px-2 underline">Later</button>
        </div>
      ) : null}
      <RedFlagOverlay />
    </>
  );
}
