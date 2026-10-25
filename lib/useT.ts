'use client';
import { tr, type TKey } from '@/lib/i18n';
import { useStore } from '@/lib/store';

export function useT() {
  const lang = useStore((s) => s.uiLang);
  return (k: TKey) => tr(lang, k);
}
