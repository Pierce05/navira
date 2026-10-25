import type { Fact } from '@/lib/db/models';
import { computeMissing } from './missing';

export type AnswerType = 'yesno' | 'scale' | 'number' | 'choice';
export interface FollowupDef {
  key: string; type: AnswerType; en: string; hi: string;
  options?: { value: string; en: string; hi: string }[];
  min?: number; max?: number; unit?: string;
  /** fact written for the answer */
  fact: { kind: Fact['kind']; key: string; label: (v: string | number | boolean) => string };
  /** yes means the opposite of the stored fact (e.g. "periods regular?" -> irregular_cycles=false) */
  invert?: boolean;
}

export const FOLLOWUPS: FollowupDef[] = [
  { key: 'pelvic_pain_severity', type: 'scale', min: 0, max: 10, en: 'On a scale of 0 to 10, how strong is the pain at its worst?', hi: '0 से 10 के पैमाने पर, दर्द सबसे ज़्यादा कितना तेज़ होता है?', fact: { kind: 'severity', key: 'pelvic_pain_severity', label: (v) => `Pain severity ${v}/10` } },
  { key: 'pelvic_pain_duration_months', type: 'number', min: 0, max: 600, unit: 'months', en: 'About how many months has this been going on?', hi: 'यह लगभग कितने महीनों से हो रहा है?', fact: { kind: 'timing', key: 'pelvic_pain_duration_months', label: (v) => `Pain for about ${v} months` } },
  {
    key: 'pelvic_pain_cycle', type: 'choice', en: 'Does the pain come around your periods?', hi: 'क्या दर्द माहवारी के आसपास होता है?',
    options: [
      { value: 'before', en: 'Before periods', hi: 'माहवारी से पहले' }, { value: 'during', en: 'During periods', hi: 'माहवारी के दौरान' },
      { value: 'after', en: 'After periods', hi: 'माहवारी के बाद' }, { value: 'any', en: 'Any time of the month', hi: 'महीने में कभी भी' },
    ],
    fact: { kind: 'cycle', key: 'pelvic_pain_cycle', label: (v) => `Pain relation to periods: ${v}` },
  },
  { key: 'missed_days_per_month', type: 'number', min: 0, max: 31, unit: 'days/month', en: 'How many days a month does the pain stop you from usual activities? (0 if none)', hi: 'महीने में कितने दिन दर्द की वजह से आप रोज़ के काम नहीं कर पातीं? (नहीं तो 0)', fact: { kind: 'impact', key: 'missed_days_per_month', label: (v) => `About ${v} days a month` } },
  { key: 'dyspareunia', type: 'yesno', en: 'Do you have pain during or after sex? You can skip this if you would rather not say.', hi: 'क्या सेक्स के दौरान या बाद में दर्द होता है? नहीं बताना चाहें तो छोड़ दें।', fact: { kind: 'symptom', key: 'dyspareunia', label: () => 'Pain during or after sex' } },
  { key: 'bowel_pain', type: 'yesno', en: 'Do you have pain when you pass stool?', hi: 'क्या शौच के समय दर्द होता है?', fact: { kind: 'symptom', key: 'bowel_pain', label: () => 'Pain with bowel movements' } },
  { key: 'urinary_pain', type: 'yesno', en: 'Do you have pain or burning when you pass urine?', hi: 'क्या पेशाब के समय दर्द या जलन होती है?', fact: { kind: 'symptom', key: 'urinary_pain', label: () => 'Urinary pain or burning' } },
  {
    key: 'analgesic_response', type: 'choice', en: 'When you take a painkiller, how well does it work?', hi: 'दर्द की दवा लेने पर कितना आराम मिलता है?',
    options: [{ value: 'relief', en: 'It works well', hi: 'अच्छा आराम' }, { value: 'partial', en: 'A little, not fully', hi: 'थोड़ा, पूरा नहीं' }, { value: 'none', en: 'Not really', hi: 'लगभग नहीं' }],
    fact: { kind: 'treatment', key: 'analgesic_response', label: (v) => `Painkillers: ${v === 'partial' ? 'partial relief' : v === 'none' ? 'no relief' : 'relief'}` },
  },
  { key: 'heavy_bleeding', type: 'yesno', en: 'Are your periods very heavy, or do you pass clots?', hi: 'क्या माहवारी में बहुत ज़्यादा खून आता है या थक्के आते हैं?', fact: { kind: 'symptom', key: 'heavy_bleeding', label: () => 'Heavy bleeding or clots' } },
  { key: 'conception_difficulty', type: 'yesno', en: 'Have you had difficulty conceiving?', hi: 'क्या गर्भधारण में मुश्किल हुई है?', fact: { kind: 'history', key: 'conception_difficulty', label: () => 'Difficulty conceiving' } },
  { key: 'cycle_regularity', type: 'yesno', invert: true, en: 'Do your periods usually come every 21 to 35 days?', hi: 'क्या आपकी माहवारी आमतौर पर हर 21 से 35 दिन में आती है?', fact: { kind: 'cycle', key: 'irregular_cycles', label: () => 'Irregular periods' } },
  { key: 'acne', type: 'yesno', en: 'Do you get acne?', hi: 'क्या आपको मुंहासे होते हैं?', fact: { kind: 'symptom', key: 'acne', label: () => 'Acne' } },
  { key: 'hirsutism', type: 'yesno', en: 'Do you notice extra hair on your face or body that bothers you?', hi: 'क्या चेहरे या शरीर पर ज़्यादा बाल दिखते हैं जो आपको परेशान करते हैं?', fact: { kind: 'symptom', key: 'hirsutism', label: () => 'Extra facial or body hair' } },
  { key: 'hair_thinning', type: 'yesno', en: 'Has the hair on your scalp been thinning?', hi: 'क्या सिर के बाल पतले हो रहे हैं?', fact: { kind: 'symptom', key: 'hair_thinning', label: () => 'Scalp hair thinning' } },
  { key: 'fatigue', type: 'yesno', en: 'Do you feel unusually tired?', hi: 'क्या आपको असामान्य थकान रहती है?', fact: { kind: 'symptom', key: 'fatigue', label: () => 'Fatigue' } },
  { key: 'family_history', type: 'yesno', en: 'Has anyone in your family had similar problems?', hi: 'क्या परिवार में किसी को ऐसी ही समस्या रही है?', fact: { kind: 'history', key: 'family_history', label: () => 'Family history of similar problems' } },
  { key: 'prior_evaluation', type: 'yesno', en: 'Have you had any scans or tests for this already?', hi: 'क्या इसके लिए पहले कोई स्कैन या जाँच हुई है?', fact: { kind: 'evaluation', key: 'prior_evaluation', label: () => 'Has had scans or tests' } },
];

/** At most 5 questions, ordered by missing-fact priority. Anything already asked or skipped is not asked again. */
export function nextFollowups(facts: Fact[], askedKeys: string[], max = 5): FollowupDef[] {
  const missing = computeMissing(facts);
  const out: FollowupDef[] = [];
  for (const m of missing) {
    if (askedKeys.includes(m.key)) continue;
    const def = FOLLOWUPS.find((d) => d.key === m.key);
    if (def) out.push(def);
    if (out.length >= max) break;
  }
  return out;
}

/** Turns an answer into a new UNCONFIRMED fact that goes through the review screen. "Not sure" stays unknown. */
export function factFromAnswer(def: FollowupDef, answer: string | number | 'unsure', id: string): Fact {
  const base = { id, kind: def.fact.kind, key: def.fact.key, provenance: 'patient_reported' as const };
  if (answer === 'unsure') return { ...base, value: null, status: 'unknown', label: `${def.fact.label('')} (not sure)`.trim() };
  let value: string | number | boolean;
  if (def.type === 'yesno') value = def.invert ? answer !== 'yes' : answer === 'yes';
  else if (def.type === 'scale' || def.type === 'number') value = Number(answer);
  else value = String(answer);
  const fact: Fact = { ...base, value, status: 'unconfirmed', label: def.fact.label(value) };
  if (def.type === 'scale') fact.severity0to10 = Number(answer);
  if (def.key === 'pelvic_pain_cycle') fact.cycleRelation = value as Fact['cycleRelation'];
  if (def.fact.key === 'missed_days_per_month') fact.unit = 'days/month';
  if (def.fact.key === 'pelvic_pain_duration_months') fact.unit = 'months';
  return fact;
}
