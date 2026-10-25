import type { Fact } from '@/lib/db/models';
import { confirmedMap, cycleRelationOf } from './engine';

export type Pathway = 'endometriosis' | 'pcos';
export interface Requirement { key: string; label: string; pathway: Pathway; anyOf?: string[] }
export interface Missing extends Requirement { unsure: boolean }

export const REQUIREMENTS: Requirement[] = [
  { key: 'pelvic_pain_severity', label: 'How strong the pain is at its worst (0–10)', pathway: 'endometriosis' },
  { key: 'pelvic_pain_duration_months', label: 'How long the pain has been going on', pathway: 'endometriosis' },
  { key: 'pelvic_pain_cycle', label: 'Whether the pain comes around periods', pathway: 'endometriosis' },
  { key: 'missed_days_per_month', label: 'Days a month the pain limits usual activities', pathway: 'endometriosis' },
  { key: 'dyspareunia', label: 'Pain during or after sex', pathway: 'endometriosis' },
  { key: 'bowel_pain', label: 'Pain with bowel movements', pathway: 'endometriosis' },
  { key: 'urinary_pain', label: 'Urinary pain or burning', pathway: 'endometriosis' },
  { key: 'analgesic_response', label: 'How well painkillers work', pathway: 'endometriosis' },
  { key: 'heavy_bleeding', label: 'Heavy bleeding or clots', pathway: 'endometriosis' },
  { key: 'conception_difficulty', label: 'Any difficulty conceiving', pathway: 'endometriosis' },
  { key: 'cycle_regularity', label: 'How regular periods are', pathway: 'pcos', anyOf: ['irregular_cycles', 'cycle_length_days', 'cycles_per_year'] },
  { key: 'acne', label: 'Acne', pathway: 'pcos' },
  { key: 'hirsutism', label: 'Extra facial or body hair', pathway: 'pcos' },
  { key: 'hair_thinning', label: 'Scalp hair thinning', pathway: 'pcos' },
  { key: 'fatigue', label: 'Fatigue', pathway: 'pcos' },
  { key: 'family_history', label: 'Family history of similar problems', pathway: 'endometriosis' },
  { key: 'prior_evaluation', label: 'Tests or scans already done, and what you were told', pathway: 'endometriosis' },
];

const ENDO_SIGNS = ['pelvic_pain', 'dyspareunia', 'bowel_pain', 'urinary_pain', 'heavy_bleeding'];
const PCOS_SIGNS = ['irregular_cycles', 'cycle_length_days', 'cycles_per_year', 'acne', 'hirsutism', 'hair_thinning'];

export function activePathways(facts: Fact[]): Pathway[] {
  const m = confirmedMap(facts);
  const has = (k: string) => m.has(k) && m.get(k)!.value !== false;
  const out: Pathway[] = [];
  if (ENDO_SIGNS.some(has)) out.push('endometriosis');
  if (PCOS_SIGNS.some(has)) out.push('pcos');
  return out;
}

export function computeMissing(facts: Fact[], pathways: Pathway[] = activePathways(facts)): Missing[] {
  const m = confirmedMap(facts);
  const unsureKeys = new Set(facts.filter((f) => f.status === 'unknown').map((f) => f.key));
  const seen = new Set<string>();
  const out: Missing[] = [];
  for (const r of REQUIREMENTS) {
    if (!pathways.includes(r.pathway)) continue;
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    let known: boolean;
    if (r.key === 'pelvic_pain_cycle') {
      known = !m.has('pelvic_pain') ? true : cycleRelationOf(m, 'pelvic_pain') !== 'unknown';
    } else if (r.anyOf) known = r.anyOf.some((k) => m.has(k));
    else known = m.has(r.key);
    if (!known) out.push({ ...r, unsure: unsureKeys.has(r.key) || (r.anyOf?.some((k) => unsureKeys.has(k)) ?? false) });
  }
  return out;
}
