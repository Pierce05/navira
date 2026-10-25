import type { Fact } from '@/lib/db/models';
import { confirmedMap, cycleRelationOf } from '@/lib/rules/engine';
import { KEY_NAMES } from '@/lib/rules/names';

export type Stage = 'onset' | 'pattern' | 'frequency' | 'severity' | 'impact';
export const STAGES: Stage[] = ['onset', 'pattern', 'frequency', 'severity', 'impact'];
export interface TimelineEntry { symptomKey: string; symptom: string; stage: Stage; text: string; approx: boolean; unknown: boolean }

const REL: Record<string, string> = {
  before: 'comes before periods', during: 'comes during periods', after: 'comes after periods', any: 'any time of the month',
};

export const SYMPTOM_KEYS = Object.keys(KEY_NAMES);

export function symptomFacts(facts: Fact[]): Fact[] {
  return facts.filter((f) => f.status === 'confirmed' && f.kind === 'symptom' && f.value !== false && f.value !== null);
}

/** Chronological view: onset -> pattern -> frequency -> severity -> impact. Unknowns are shown, never hidden. */
export function buildTimeline(allFacts: Fact[]): TimelineEntry[] {
  const m = confirmedMap(allFacts);
  const out: TimelineEntry[] = [];
  const syms = symptomFacts(allFacts);
  const main = syms.find((s) => s.key === 'pelvic_pain') ?? syms[0];
  for (const s of syms) {
    const name = KEY_NAMES[s.key] ?? s.label ?? s.key;
    const isMain = s.key === 'pelvic_pain';
    const add = (stage: Stage, text: string | null, approx = false) =>
      out.push({ symptomKey: s.key, symptom: name, stage, text: text ?? 'unknown', approx, unknown: text === null });

    // onset
    let onset: string | null = null, approx = false;
    if (isMain) {
      const dur = m.get('pelvic_pain_duration_months'), on = m.get('pelvic_pain_onset');
      if (on?.approxDate) { onset = `Started ${on.approxDate.text}`; approx = true; }
      else if (dur && typeof dur.value === 'number') { onset = `Present for about ${dur.value % 12 === 0 ? `${dur.value / 12} year${dur.value === 12 ? '' : 's'}` : `${dur.value} months`}`; approx = true; }
    }
    add('onset', onset, approx);

    // pattern
    const rel = cycleRelationOf(m, s.key);
    add('pattern', rel === 'unknown' ? null : REL[rel] ?? null);
    // frequency
    const pat = isMain ? m.get('pain_pattern') : undefined;
    add('frequency', pat ? `Happens ${String(pat.value)}` : null);
    // severity
    const sev = isMain ? m.get('pelvic_pain_severity') : undefined;
    add('severity', sev && typeof sev.value === 'number' ? `${sev.value}/10 at its worst` : null);
    // impact (attached to the main symptom only)
    let impact: string | null = null;
    if (s === main) {
      const act = m.get('missed_activity'), days = m.get('missed_days_per_month'), sleep = m.get('sleep_disruption');
      const parts: string[] = [];
      if (act) parts.push(`sometimes misses ${String(act.value)}${days ? ` (${String(days.value)} days a month)` : ''}`);
      else if (days && days.value !== 0) parts.push(`limits usual activities ${String(days.value)} days a month`);
      if (sleep && sleep.value) parts.push('sleep affected');
      impact = parts.length ? parts.join('; ') : null;
    }
    add('impact', impact);
  }
  return out;
}

/** One compact line for the brief: onset -> pattern -> frequency. */
export function compactTimeline(entries: TimelineEntry[]): string {
  if (!entries.length) return 'No confirmed symptoms yet.';
  const key = entries.find((e) => e.symptomKey === 'pelvic_pain')?.symptomKey ?? entries[0].symptomKey;
  const mine = entries.filter((e) => e.symptomKey === key);
  const g = (s: Stage) => mine.find((e) => e.stage === s)!;
  const label = (e: TimelineEntry) => (e.unknown ? 'unknown' : e.text + (e.approx ? ' (approx.)' : ''));
  return `Onset: ${label(g('onset'))}  |  Pattern: ${label(g('pattern'))}  |  Frequency: ${label(g('frequency'))}`;
}
