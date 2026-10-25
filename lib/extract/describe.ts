import type { Fact } from '@/lib/db/models';
import { KEY_NAMES } from '@/lib/rules/names';

const REL: Record<string, string> = { before: 'before periods', during: 'during periods', after: 'after periods', any: 'any time of the month' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Plain-language label for a fact as currently stored (no "please check" caveats once the person has touched it). */
export function describe(f: Fact): string {
  const v = f.value;
  switch (f.key) {
    case 'pelvic_pain_severity': return typeof v === 'number' ? `Pain severity ${v}/10` : 'Pain severity: not sure';
    case 'pelvic_pain_duration_months': return typeof v === 'number' ? `Pain for about ${v % 12 === 0 && v > 0 ? `${v / 12} year${v === 12 ? '' : 's'}` : `${v} months`}` : 'Pain duration: not sure';
    case 'pelvic_pain_onset': return `Started: ${String(v)} (approx.)`;
    case 'pain_pattern': return `Happens ${String(v)}`;
    case 'missed_activity': return `Sometimes misses ${String(v)}`;
    case 'missed_days_per_month': return `About ${String(v)} days a month`;
    case 'analgesic_response': return `Painkillers: ${v === 'partial' ? 'partial relief' : v === 'none' ? 'no relief' : 'relief'}`;
    case 'analgesics': return 'Takes painkillers';
    case 'cycle_length_days': return `Cycle about ${String(v)} days`;
    case 'subfertility_months': return `Trying to conceive for about ${String(v)} months`;
    case 'pelvic_pain_cycle': return `Pain relation to periods: ${REL[String(v)] ?? String(v)}`;
    default: break;
  }
  if (f.kind === 'symptom' && KEY_NAMES[f.key]) {
    const name = cap(KEY_NAMES[f.key]);
    const rel = f.cycleRelation && f.cycleRelation !== 'unknown' ? ` (${REL[f.cycleRelation]})` : '';
    return v === false ? `No ${KEY_NAMES[f.key]}` : `${name}${rel}`;
  }
  if (typeof v === 'boolean') return f.label?.replace(/\s*\(.*\)\s*$/, '') ?? f.key.replace(/_/g, ' ');
  return f.label?.replace(/\s*\((?:please check|you mentioned|around periods\?|suggested)[^)]*\)\s*$/i, '') ?? `${f.key.replace(/_/g, ' ')}: ${String(v)}`;
}

export const KIND_ORDER: Fact['kind'][] = ['symptom', 'timing', 'severity', 'impact', 'treatment', 'cycle', 'history', 'evaluation'];
export const KIND_TITLE: Record<Fact['kind'], string> = {
  symptom: 'Symptoms', timing: 'When and how long', severity: 'How strong', impact: 'Effect on daily life', treatment: 'What you have tried',
  cycle: 'Periods and cycle', history: 'Background', evaluation: 'Tests and what you were told',
};
