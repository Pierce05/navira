/**
 * Red-flag scan. Rule-based (regex), runs offline, no model, and runs FIRST on every transcript, answer and note.
 * NOTE FOR LAUNCH: emergency numbers below (112, Tele-MANAS 14416) MUST be verified before any public release.
 */
import flagsJson from '@/rules/redflags.json';

export interface RedFlagHit { id: string; category: 'urgent' | 'selfharm'; label: string; match: string }
interface FlagDef { id: string; category: 'urgent' | 'selfharm'; label: string; requireAll: string[][] }

const FLAGS = (flagsJson.flags as FlagDef[]).map((f) => ({
  ...f,
  groups: f.requireAll.map((g) => g.map((p) => new RegExp(p, 'i'))),
}));

export const REDFLAG_RULES_VERSION = flagsJson.version;

/**
 * True when the text just before a match negates it ("no fainting", "not bleeding heavily").
 * Applies to URGENT flags only. It is deliberately never applied to self-harm: a missed alert there is far worse
 * than a false one, and phrases like "I don't think I want to die" must still show the support card.
 * Note: Hinglish "na" is a common filler, not a negation, so it is not in this list.
 */
function negated(text: string, index: number, category: 'urgent' | 'selfharm'): boolean {
  if (category === 'selfharm') return false;
  const before = text.slice(Math.max(0, index - 22), index);
  return /(?:\bno\b|\bnot\b|\bnever\b|\bwithout\b|n't\b|\bnahi\b|\bnahin\b|नहीं)\s*(?:\w+\s*){0,2}$/i.test(before);
}

export function scanRedFlags(text: string): RedFlagHit[] {
  const hits: RedFlagHit[] = [];
  if (!text || !text.trim()) return hits;
  for (const f of FLAGS) {
    let first: string | null = null;
    let ok = true;
    for (const group of f.groups) {
      let groupHit: string | null = null;
      for (const re of group) {
        const g = new RegExp(re.source, 'gi');
        let m: RegExpExecArray | null;
        while ((m = g.exec(text))) {
          if (!negated(text, m.index, f.category)) { groupHit = m[0]; break; }
          if (m[0].length === 0) g.lastIndex++;
        }
        if (groupHit) break;
      }
      if (!groupHit) { ok = false; break; }
      if (!first) first = groupHit;
    }
    if (ok && first) hits.push({ id: f.id, category: f.category, label: f.label, match: first });
  }
  return hits;
}

export const EMERGENCY = {
  national: '112',
  teleManas: '14416', // verify before launch
};
