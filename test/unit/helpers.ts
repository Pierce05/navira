import type { Fact, Story } from '@/lib/db/models';
import { extractFacts } from '@/lib/extract/lexicon';
import narratives from '../narratives/narratives.json';

export const confirmAll = (facts: Fact[]): Fact[] => facts.map((f) => ({ ...f, status: 'confirmed' as const, needsCheck: false }));
export const text = (i: number) => (narratives as { text: string }[])[i].text;

export function storyFrom(t: string, opts: { confirm?: boolean; synthetic?: boolean } = {}): Story {
  const facts = extractFacts(t);
  return {
    id: 's1', createdAt: '2026-10-24T00:00:00.000Z', lang: 'hinglish', transcript: t,
    facts: opts.confirm === false ? facts : confirmAll(facts), askedKeys: [], followupsDone: false,
    synthetic: opts.synthetic ?? false, excerpt: t.slice(0, 200), confirmedAt: '2026-10-24T00:00:00.000Z',
  };
}
