/**
 * Deterministic EN / Hindi / Hinglish fact extractor. No network, no model.
 * Everything returned is a CANDIDATE (status 'unconfirmed'); nothing is inferred beyond the words used.
 * Where context is borrowed from a neighbouring sentence the fact is flagged `needsCheck`.
 */
import type { CycleRelation, Fact, FactKind, Provenance } from '@/lib/db/models';
import {
  parseApproxDate, parseCycleLength, parseDaysPerMonth, parseDurationMonths, parsePattern,
  parseSeverityNumeric, parseSeverityWords,
} from './parsers';

export interface ExtractOptions { idGen?: () => string; now?: Date }

interface Sentence { text: string; start: number; end: number }

export function splitSentences(t: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n।]+[.!?\n।]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[0].trim()) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const PERIOD_WORDS = /(periods?|mahwari|mahavari|\bmc\b|menstrua\w*|माहवारी|पीरियड\w*)/i;

export function cycleRelationIn(sentence: string): CycleRelation {
  if (/(periods?|mahwari|माहवारी)\s*(se\s*)?pehle|before\s+(my\s+)?periods?|periods? से पहले/i.test(sentence)) return 'before';
  if (/(periods?|mahwari|माहवारी)\s*ke\s*baad|after\s+(my\s+)?periods?/i.test(sentence)) return 'after';
  if (PERIOD_WORDS.test(sentence)) return 'during';
  return 'unknown';
}

interface SymptomDef {
  key: string;
  label: string;
  patterns: RegExp[];
  cycle?: boolean;
  /** pattern only counts as a symptom with a caution flag (dropped words) */
  weakPatterns?: RegExp[];
}

const SYMPTOMS: SymptomDef[] = [
  {
    key: 'pelvic_pain', label: 'Pelvic / lower-belly pain', cycle: true,
    patterns: [
      /pet\s*(?:mein|me|main)?\s*(?:bahut\s*)?(?:zyada\s*)?(?:dard|marod|dukh)/i,
      /pelvic\s+pain|period\s+pain|period\s+cramps?|menstrual\s+cramps?|abdominal\s+pain|stomach\s+(?:pain|cramps?)|lower\s+(?:belly|abdomen)\s+pain|cramps?/i,
      /periods?\s*(?:ke\s*time|mein|me|ke\s*dauran)\s*(?:bahut\s*)?(?:zyada\s*)?dard/i,
      /पेट\s*(?:में\s*)?दर्द|कमर\s*दर्द|kamar\s*dard|माहवारी\s*में\s*दर्द/i,
    ],
  },
  {
    key: 'dyspareunia', label: 'Pain during or after sex', cycle: false,
    patterns: [
      /(?:sex|relation|intercourse)\s*(?:ke\s*(?:time|dauran|baad)|mein|me)\s*(?:bhi\s*)?(?:bahut\s*)?dard/i,
      /pain\s+(?:during|with|after)\s+(?:sex|intercourse)|painful\s+(?:sex|intercourse)|dyspareunia|sex\s+(?:hurts|is painful)/i,
      /सेक्स\s*(?:के\s*(?:समय|दौरान)\s*)?दर्द|संबंध\s*(?:बनाते\s*समय|में)\s*दर्द/,
    ],
  },
  {
    key: 'bowel_pain', label: 'Pain with bowel movements', cycle: true,
    patterns: [
      /(?:potty|motion|latrine|toilet)\s*(?:ke\s*(?:time|dauran)|mein|me)\s*(?:bhi\s*)?(?:bahut\s*)?dard/i,
      /painful\s+bowel|pain\s+(?:with|during|when)\s+(?:a\s+)?(?:bowel|poop|stool|pooping)|bowel\s+movements?\s+(?:hurt|are painful)/i,
      /शौच\s*(?:के\s*समय\s*)?दर्द/,
    ],
    weakPatterns: [/(?:aur|and|also)\s+(?:potty|motion|latrine)\s*(?:ke\s*(?:time|dauran)|mein|me)\s*bhi/i],
  },
  {
    key: 'urinary_pain', label: 'Urinary pain or burning', cycle: true,
    patterns: [
      /(?:peshab|urine|susu)\s*(?:ke\s*time|mein|me|karte\s*time)?\s*(?:bhi\s*)?(?:dard|jalan)/i,
      /painful\s+urination|burning\s+(?:when\s+)?(?:urinat\w*|peeing)|pain\s+(?:when|while)\s+(?:urinating|peeing)|blood\s+in\s+(?:my\s+)?urine|urine\s+mein\s+khoon/i,
    ],
  },
  {
    key: 'heavy_bleeding', label: 'Heavy bleeding or clots', cycle: true,
    patterns: [
      /(?:zyada|jyada|bahut|heavy)\s*(?:bleeding|khoon|flow)|heavy\s+(?:periods?|bleeding|flow)|clots?\b|खून\s*ज्यादा|ज्यादा\s*ब्लीडिंग/i,
    ],
  },
  { key: 'fatigue', label: 'Fatigue', patterns: [/thakan|thakaan|kamzori|fatigue|tired(?:ness)?|exhausted|थकान|कमजोरी/i] },
  { key: 'hair_thinning', label: 'Scalp hair thinning or fall', patterns: [/baal\s*(?:bahut\s*)?(?:jhad|jhadna|jhadte|patle|girte)|hair\s*(?:loss|thinning|fall|is thinning)|thinning\s+hair|बाल\s*झड़/i] },
  { key: 'acne', label: 'Acne', patterns: [/pimples?|muhase|muhaase|acne|breakouts?|मुंहासे|मुहांसे/i] },
  {
    key: 'hirsutism', label: 'Extra facial or body hair',
    patterns: [/(?:chehre|face|chin|thodi|upper\s*lip)\s*(?:par|pe|per|ke|on)?\s*(?:extra\s*|zyada\s*)?(?:baal|hair)|facial\s+hair|unwanted\s+hair|excess\s+hair|hirsut\w*/i],
  },
  {
    key: 'irregular_cycles', label: 'Irregular periods',
    patterns: [
      /irregular\s+(?:periods?|cycles?|mahwari)|(?:periods?|cycles?|mahwari)\s*(?:are\s*|hain\s*|bhi\s*)?irregular|(?:periods?|mahwari)\s*(?:time\s*pe\s*)?(?:nahi\s*aat[ei]|late\s*aat[ei]|miss\s*ho)|periods?\s+(?:come|are)\s+(?:late|rarely)|अनियमित/i,
    ],
  },
];

const ACTIVITY = /(college|school|office|kaam|work|class(?:es)?|padhai|कॉलेज|स्कूल|ऑफिस)/i;
const MISSED = new RegExp(
  `(?:${ACTIVITY.source})\\s*(?:se|mein|me|ko|jaa?na|ja)?\\s*(?:chhutti|nahi|na)\\s*(?:ja\\s*pa+(?:ti|ta)|jaa\\s*pa+(?:ti|ta)|ja\\s*sakti|jaa\\s*sakti|jati|jaa?ta|ho\\s*pa+ta|aa\\s*pa+ti)|miss(?:ed|ing)?\\s+(?:my\\s+)?(?:classes|class|school|college|work|office)|can'?t\\s+(?:go\\s+to|attend)\\s+(?:college|school|work|class)|chhutti\\s+leni|नहीं\\s*जा\\s*पाती|छुट्टी`,
  'i',
);
const ANALGESICS = /painkillers?|pain\s*killers?|ibuprofen|meftal(?:\s*spas)?|paracetamol|crocin|combiflam|naproxen|brufen|दर्द\s*की\s*दवा/i;

let counter = 0;
const defaultId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function extractFacts(transcript: string, opts: ExtractOptions = {}): Fact[] {
  const id = opts.idGen ?? defaultId;
  const now = opts.now ?? new Date();
  const sentences = splitSentences(transcript);
  const facts: Fact[] = [];

  const add = (f: {
    kind: FactKind; key: string; value: Fact['value']; label: string; span?: [number, number]; evidence?: string;
    cycleRelation?: CycleRelation; severity0to10?: number; approxDate?: Fact['approxDate'];
    provenance?: Provenance; needsCheck?: boolean; unit?: string;
  }) => {
    if (facts.some((x) => x.key === f.key)) return;
    facts.push({
      id: id(), kind: f.kind, key: f.key, value: f.value, label: f.label, sourceSpan: f.span, evidence: f.evidence,
      cycleRelation: f.cycleRelation, severity0to10: f.severity0to10, approxDate: f.approxDate, unit: f.unit,
      provenance: f.provenance ?? 'patient_reported', status: 'unconfirmed', needsCheck: f.needsCheck,
    });
  };

  const findIn = (res: RegExp[]) => {
    for (const s of sentences) for (const re of res) {
      const m = re.exec(s.text);
      if (m) return { s, m, span: [s.start + m.index, s.start + m.index + m[0].length] as [number, number] };
    }
    return null;
  };

  // Symptoms (pelvic pain first: later symptoms may borrow its cycle context, flagged for checking)
  let painRel: CycleRelation = 'unknown';
  for (const def of SYMPTOMS) {
    let hit = findIn(def.patterns);
    let weak = false;
    if (!hit && def.weakPatterns) { hit = findIn(def.weakPatterns); weak = !!hit; }
    if (!hit) continue;
    let rel: CycleRelation | undefined;
    let needsCheck = weak;
    let label = def.label;
    if (def.cycle) {
      rel = cycleRelationIn(hit.s.text);
      if (rel === 'unknown' && def.key !== 'pelvic_pain' && painRel !== 'unknown') {
        rel = painRel; // borrowed from the main pain sentence
        needsCheck = true;
      }
      if (def.key === 'pelvic_pain') painRel = rel;
    }
    if (weak) label = `${def.label} (you mentioned it without saying "pain": please check)`;
    else if (needsCheck) label = `${def.label} (around periods? borrowed from your story: please check)`;
    add({
      kind: 'symptom', key: def.key, value: true, label, span: hit.span, evidence: hit.m[0], cycleRelation: rel,
      needsCheck,
    });
  }

  const pain = facts.find((f) => f.key === 'pelvic_pain');
  const painSentence = pain?.sourceSpan ? sentences.find((s) => pain.sourceSpan![0] >= s.start && pain.sourceSpan![0] < s.end) : undefined;

  if (painSentence) {
    const sevN = parseSeverityNumeric(painSentence.text);
    if (sevN) {
      add({ kind: 'severity', key: 'pelvic_pain_severity', value: sevN.value, severity0to10: sevN.value, label: `Pain severity ${sevN.value}/10`, span: [painSentence.start + sevN.span[0], painSentence.start + sevN.span[1]], evidence: sevN.text });
    } else {
      const sevW = parseSeverityWords(painSentence.text);
      if (sevW) {
        add({
          kind: 'severity', key: 'pelvic_pain_severity', value: sevW.value.suggested, severity0to10: sevW.value.suggested,
          label: `Pain severity: you said "${sevW.value.word.trim()}" (suggested ${sevW.value.suggested}/10: please set your own number)`,
          span: [painSentence.start + sevW.span[0], painSentence.start + sevW.span[1]], evidence: sevW.text, provenance: 'system_interpretation', needsCheck: true,
        });
      }
    }
    const dur = parseDurationMonths(painSentence.text);
    if (dur) {
      const years = dur.value % 12 === 0 ? `${dur.value / 12} year${dur.value === 12 ? '' : 's'}` : `${dur.value} months`;
      add({ kind: 'timing', key: 'pelvic_pain_duration_months', value: dur.value, unit: 'months', label: `Pain for about ${years}`, span: [painSentence.start + dur.span[0], painSentence.start + dur.span[1]], evidence: dur.text });
    }
    const onset = parseApproxDate(painSentence.text, now) ?? parseApproxDate(transcript, now);
    if (onset) add({ kind: 'timing', key: 'pelvic_pain_onset', value: onset.text, approxDate: onset, label: `Started: ${onset.text} (approx.)`, evidence: onset.text });
    const pat = parsePattern(painSentence.text);
    if (pat) add({ kind: 'timing', key: 'pain_pattern', value: pat.value, label: `Happens ${pat.text}`, evidence: pat.text });
  }

  // Impact
  const missed = findIn([MISSED]);
  if (missed) {
    const act = ACTIVITY.exec(missed.s.text)?.[1]?.toLowerCase() ?? '';
    const what = /office|work|kaam|ऑफिस/.test(act) ? 'work' : 'classes';
    add({ kind: 'impact', key: 'missed_activity', value: what, label: `Sometimes misses ${what}`, span: missed.span, evidence: missed.m[0] });
    const dpm = parseDaysPerMonth(missed.s.text);
    if (dpm) add({ kind: 'impact', key: 'missed_days_per_month', value: dpm.value, unit: 'days/month', label: `About ${dpm.value} days a month`, span: [missed.s.start + dpm.span[0], missed.s.start + dpm.span[1]], evidence: dpm.text });
  }
  const sleep = findIn([/(?:neend|sleep)[^.]{0,30}(?:nahi|disturb|affect|kharab|problem|issue)|can'?t\s+sleep|neend\s+nahi\s+aati|नींद/i]);
  if (sleep) add({ kind: 'impact', key: 'sleep_disruption', value: true, label: 'Sleep is affected', span: sleep.span, evidence: sleep.m[0] });

  // Treatments
  const med = findIn([ANALGESICS]);
  if (med) {
    add({ kind: 'treatment', key: 'analgesics', value: true, label: 'Takes painkillers', span: med.span, evidence: med.m[0] });
    const t = med.s.text;
    let resp: string | null = null;
    if (/(?:fayda|farak|asar)\s*nahi|no\s+relief|doesn'?t\s+(?:help|work)|kuch\s+nahi\s+hota|koi\s+aaram\s+nahi|bilkul\s+aaram\s+nahi/i.test(t)) resp = 'none';
    else if (/(?:thoda|kuch|little|partial\w*|somewhat)[^.]{0,25}(?:aaram|relief|better|help)|(?:aaram|relief)[^.]{0,35}(?:pura|poora|full\w*)\s*nahi|(?:but\s+)?not\s+(?:fully|completely)/i.test(t)) resp = 'partial';
    else if (/(?:aaram|relief)\s*(?:mil(?:ta|ti)|hota)|helps?|works?/i.test(t)) resp = 'relief';
    if (resp) add({ kind: 'treatment', key: 'analgesic_response', value: resp, label: resp === 'partial' ? 'Painkillers: partial relief' : resp === 'none' ? 'Painkillers: no relief' : 'Painkillers: relief', evidence: t.trim().slice(0, 80) });
  }
  const horm = findIn([/birth\s+control|contraceptive|\bocps?\b|hormonal\s+(?:pills?|treatment|medication)|hormone\s+(?:pills?|therapy|tablets?)/i]);
  if (horm) add({ kind: 'treatment', key: 'hormonal_treatment', value: true, label: 'Has tried hormonal treatment', span: horm.span, evidence: horm.m[0] });

  // Cycle
  const cl = parseCycleLength(transcript);
  if (cl) add({ kind: 'cycle', key: 'cycle_length_days', value: cl.value, unit: 'days', label: `Cycle about ${cl.value} days`, span: cl.span, evidence: cl.text });

  // History
  const fam = findIn([/(?:mummy|mom|mother|maa|mum|sister|behen|didi|aunt|massi|mausi|chachi|bua|cousin|grandmother|nani|dadi)[^.]{0,50}(?:endometriosis|pcos|pcod|same\s+problem|similar\s+(?:problem|symptoms)|aisi\s+hi\s+problem)/i]);
  if (fam) add({ kind: 'history', key: 'family_history', value: fam.m[0].trim().slice(0, 90), label: 'Family history mentioned', span: fam.span, evidence: fam.m[0] });
  const conc = findIn([/(?:conceive|pregnan\w+|bachcha|baby)[^.]{0,40}(?:nahi|difficult|trouble|trying|try)|trying\s+(?:for|to)[^.]{0,20}(?:baby|pregnan|conceive)|nahi\s+ho\s+rahi\s+pregnan/i]);
  if (conc) {
    add({ kind: 'history', key: 'conception_difficulty', value: true, label: 'Difficulty conceiving', span: conc.span, evidence: conc.m[0] });
    const d = parseDurationMonths(conc.s.text);
    if (d) add({ kind: 'history', key: 'subfertility_months', value: d.value, unit: 'months', label: `Trying for about ${d.value} months`, evidence: d.text });
  }

  // Prior evaluation
  const ev = findIn([/ultrasound|sonography|\bmri\b|\bscan\b|blood\s+tests?|hormone\s+(?:test|panel)|lab\s+(?:test|report)/i]);
  if (ev) add({ kind: 'evaluation', key: 'prior_evaluation', value: ev.m[0].toLowerCase(), label: `Had: ${ev.m[0].toLowerCase()}`, span: ev.span, evidence: ev.m[0] });
  const told = findIn([/(?:said|told\s+(?:me\s+)?(?:that\s+)?)\s*(?:it'?s|it\s+(?:is|was))\s+(?:just\s+)?(?:normal|stress)|normal\s+(?:hai|hain|bola|kaha|bataya)|sab\s+normal|just\s+stress|stress\s+(?:hai|ki\s+wajah)/i]);
  if (told) add({ kind: 'evaluation', key: 'told_normal', value: true, label: 'Was told it is normal or stress', span: told.span, evidence: told.m[0] });

  return facts.sort((a, b) => (a.sourceSpan?.[0] ?? 1e9) - (b.sourceSpan?.[0] ?? 1e9));
}
