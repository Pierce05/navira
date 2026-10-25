import type { Fact, RuleResult, Story } from '@/lib/db/models';
import { PACKS, RULES_VERSION, confirmedMap, cycleRelationOf, rulesReviewed, type RulePack } from '@/lib/rules/engine';
import { computeMissing } from '@/lib/rules/missing';
import { KEY_NAMES } from '@/lib/rules/names';
import { buildTimeline, compactTimeline, symptomFacts } from './timeline';

export interface BriefModel {
  title: string; generatedOn: string; initials?: string; disclaimer: string; synthetic: boolean;
  excerpt: string; timelineLine: string;
  symptoms: { name: string; severity: string; cycle: string; since: string; confirmed: string }[];
  impact: string[]; tried: string[]; history: string[];
  /** false when history is empty AND the same gap is already listed under Not yet known (avoids saying it twice) */
  showHistory: boolean;
  features: { id: string; text: string; source: string }[];
  notKnown: string[]; questions: string[]; safetyNote?: string; notes?: string;
  sources: string[]; rulesVersion: string; confirmedOn: string;
  /** shown in the footer until every rule pack is reviewed; null afterwards */
  draftNotice: string | null;
}

export const DRAFT_NOTICE = 'Rule wording is a draft pending clinician review.';
/** Dev markers such as "(verify)" live in the rule files only; they never reach a patient-facing brief. */
export const cleanMarkers = (t: string) => t.replace(/\s*\((?:verify|to verify)\)/gi, '').replace(/\s{2,}/g, ' ').trim();

export const DISCLAIMER = 'Not a diagnosis. Prepared by the patient with Navira.';
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const CAP = { symptoms: 9, features: 7, notKnown: 7, history: 4, tried: 3, impact: 3 };

const CYCLE_WORD: Record<string, string> = { before: 'before periods', during: 'during periods', after: 'after periods', any: 'any time', unknown: 'unknown' };
const RESP: Record<string, string> = { partial: 'partial relief', none: 'no relief', relief: 'relief' };

export function suggestQuestions(facts: Fact[], results: RuleResult[]): string[] {
  const fired = new Set(results.filter((r) => r.fired).map((r) => r.ruleId));
  const q: string[] = ['Which tests or referrals would help clarify what is behind these symptoms?'];
  if (fired.has('ENDO-06')) q.push('Painkillers only help partly. What other options are there?');
  if (fired.has('ENDO-03')) q.push('Could the pain during sex be connected to my other symptoms?');
  if (fired.has('ENDO-05')) q.push('Should my difficulty conceiving be looked into alongside these symptoms?');
  if (fired.has('PCOS-01')) q.push('Which tests would help look at my cycle pattern?');
  if (fired.has('PCOS-02')) q.push('Could my skin and hair changes be looked at together with my cycle?');
  if (fired.has('ENDO-02')) q.push('The pain affects my daily life. What can help while we find out more?');
  const missing = computeMissing(facts);
  if (missing.length) q.push('Is there anything from the "not yet known" list that you would like me to track before the next visit?');
  q.push('What should I watch for that would mean I should come back sooner?');
  return [...new Set(q)].slice(0, 5);
}

export interface BuildArgs {
  story: Story; results: RuleResult[]; questions?: string[]; notes?: string; includeSafety?: boolean;
  safetyLabels?: string[]; initials?: string; excerpt?: string; now?: Date; packs?: RulePack[];
}

export function buildBriefModel(a: BuildArgs): BriefModel {
  const now = a.now ?? new Date();
  const facts = a.story.facts;
  const m = confirmedMap(facts);
  const fired = a.results.filter((r) => r.fired);
  const date = now.toISOString().slice(0, 10);

  const symptoms = symptomFacts(facts).slice(0, CAP.symptoms).map((s) => {
    const main = s.key === 'pelvic_pain';
    const sev = main ? m.get('pelvic_pain_severity') : undefined;
    const dur = main ? m.get('pelvic_pain_duration_months') : undefined;
    const on = main ? m.get('pelvic_pain_onset') : undefined;
    return {
      name: cap(KEY_NAMES[s.key] ?? s.label ?? s.key),
      severity: sev && typeof sev.value === 'number' ? `${sev.value}/10` : 'unknown',
      cycle: CYCLE_WORD[cycleRelationOf(m, s.key)],
      since: on?.approxDate ? `${on.approxDate.text} (approx.)` : dur && typeof dur.value === 'number' ? `about ${dur.value} months` : 'unknown',
      confirmed: 'Yes',
    };
  });

  const impact: string[] = [];
  const act = m.get('missed_activity'), days = m.get('missed_days_per_month');
  if (act) impact.push(`Sometimes misses ${String(act.value)}${days ? `, about ${String(days.value)} days a month` : ''}`);
  else if (days && days.value !== 0) impact.push(`Pain limits usual activities about ${String(days.value)} days a month`);
  if (m.get('sleep_disruption')?.value) impact.push('Sleep is affected');

  const tried: string[] = [];
  if (m.get('analgesics')?.value) {
    const r = m.get('analgesic_response');
    tried.push(`Painkillers${r ? `: ${RESP[String(r.value)] ?? r.value}` : ''}`);
  } else if (m.get('analgesic_response')) tried.push(`Painkillers: ${RESP[String(m.get('analgesic_response')!.value)]}`);
  if (m.get('hormonal_treatment')?.value) tried.push('Has tried hormonal treatment');

  const history: string[] = [];
  const fam = m.get('family_history');
  if (fam && fam.value) history.push(`Family: ${typeof fam.value === 'string' && fam.value.length > 3 ? fam.value : 'similar problems reported'}`);
  const ev = m.get('prior_evaluation');
  if (ev && ev.value) history.push(`Previous: ${typeof ev.value === 'string' ? ev.value : 'scans or tests done'}`);
  if (m.get('told_normal')?.value) history.push('Was told it is normal or stress');
  if (m.get('conception_difficulty')?.value) history.push('Difficulty conceiving reported');

  const features = fired.slice(0, CAP.features).map((r) => ({ id: r.ruleId, text: r.text, source: cleanMarkers(`${r.source.name}${r.source.section ? ` ${r.source.section}` : ''}`) }));
  const missing = computeMissing(facts);
  const historyGapListed = missing.some((x) => x.key === 'family_history' || x.key === 'prior_evaluation');
  const notKnown = missing.slice(0, CAP.notKnown).map((x) => x.label + (x.unsure ? ' (not sure)' : ''));
  if (missing.length > CAP.notKnown) notKnown.push(`and ${missing.length - CAP.notKnown} more`);

  const safetyNote = a.includeSafety && a.safetyLabels?.length
    ? `Safety note: urgent-care guidance was shown to the patient (${a.safetyLabels.join('; ')}).` : undefined;

  const timelineEntries = buildTimeline(facts);
  const excerpt = (a.excerpt ?? a.story.excerpt ?? '').trim();

  return {
    title: 'Patient-reported symptom summary', generatedOn: date, initials: a.initials, disclaimer: DISCLAIMER,
    synthetic: !!a.story.synthetic,
    excerpt: excerpt.length > 260 ? `${excerpt.slice(0, 257)}...` : excerpt,
    timelineLine: compactTimeline(timelineEntries),
    symptoms, impact: impact.slice(0, CAP.impact), tried: tried.slice(0, CAP.tried), history: history.slice(0, CAP.history), showHistory: history.length > 0 || !historyGapListed,
    features, notKnown, questions: (a.questions ?? suggestQuestions(facts, a.results)).slice(0, 5), safetyNote, notes: a.notes,
    sources: [...new Set(fired.map((r) => cleanMarkers(r.source.name)))],
    rulesVersion: RULES_VERSION, draftNotice: rulesReviewed(a.packs ?? PACKS) ? null : DRAFT_NOTICE, confirmedOn: (a.story.confirmedAt ?? now.toISOString()).slice(0, 10),
  };
}
