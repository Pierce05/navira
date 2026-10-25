'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { getNetCounts, subscribeNet } from '@/lib/privacy/netmonitor';
import { useT } from '@/lib/useT';

const server = { userContent: 0, assets: 0, modelWeights: 0, log: [] };
export function useNet() { return useSyncExternalStore(subscribeNet, getNetCounts, () => server); }

export function NetPill() {
  const n = useNet();
  const t = useT();
  const ok = n.userContent === 0;
  return (
    <Link href="/privacy/" className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-sm ${ok ? 'border-line text-ink' : 'border-danger text-danger'}`} aria-label={`${t('network')}: ${n.userContent} requests carrying your content`}>
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-sage' : 'bg-danger'}`} />
      {t('network')}: {n.userContent} {ok ? '' : '!'}
    </Link>
  );
}
