'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';

/** Loads the synthetic Hinglish script. Doubles as the demo fallback if mic or model fails. */
export function DemoButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  const { loadDemo, giveConsent } = useStore();
  return (
    <Button variant="secondary" className={className} onClick={() => { giveConsent(); loadDemo(); router.push('/story/'); }}>
      {t('useDemo')}
    </Button>
  );
}
