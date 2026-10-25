/** Small deterministic parsers for numbers, durations, frequencies and fuzzy dates. Never invents exact dates. */

const WORD_NUM: Record<string, number> = {
  ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5,
  chhe: 6, chah: 6, chhah: 6, six: 6, saat: 7, seven: 7, aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10,
  barah: 12, twelve: 12,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
};
const NUM = '(?<![A-Za-z])(\\d{1,3}|ek|one|do|two|teen|three|chaar|char|four|paanch|panch|five|chhe|chhah|chah|six|saat|seven|aath|eight|nau|nine|das|ten|barah|twelve|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस)(?![A-Za-z])';

export function toNum(tok: string): number | null {
  const t = tok.toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return WORD_NUM[t] ?? null;
}

export interface Found<T> { value: T; span: [number, number]; text: string }

/** Numeric severity: "8/10", "8 out of 10". */
export function parseSeverityNumeric(s: string): Found<number> | null {
  const m = /(\d{1,2})\s*(?:\/|out of|upar|se)\s*10\b/i.exec(s);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (v < 0 || v > 10) return null;
  return { value: v, span: [m.index, m.index + m[0].length], text: m[0] };
}

/** Severity in words. The 0-10 value is a suggestion the person must confirm or change. */
export function parseSeverityWords(s: string): Found<{ word: string; suggested: number }> | null {
  const rules: [RegExp, number][] = [
    [/(unbearable|excruciating|bahut\s+(?:zyada|jyada|tez)|bohot\s+(?:zyada|jyada|tez)|bahut\s+bura|बहुत\s*(?:ज्यादा|ज़्यादा|तेज़|तेज)|severe|very bad)/i, 8],
    [/(kaafi|kafi|काफी)\s+(?:zyada|jyada|tez)|quite (?:bad|painful)|moderate/i, 6],
    [/(\bmild\b|\bslight\b|halka|हल्का)/i, 3],
  ];
  for (const [re, v] of rules) {
    const m = re.exec(s);
    if (m) return { value: { word: m[0], suggested: v }, span: [m.index, m.index + m[0].length], text: m[0] };
  }
  return null;
}

/** "do saal", "2 years", "6 mahine" -> months. */
export function parseDurationMonths(s: string): Found<number> | null {
  const re = new RegExp(`${NUM}\\s*(?:\\+\\s*)?(saal|sal|years?|yrs?|mahine|mahina|maheene|months?|weeks?|hafte|हफ्ते|साल|महीने)`, 'i');
  const m = re.exec(s);
  if (!m) return null;
  const n = toNum(m[1]);
  if (n === null) return null;
  const unit = m[2].toLowerCase();
  let months: number;
  if (/saal|sal|year|yr|साल/.test(unit)) months = n * 12;
  else if (/week|hafte|हफ्ते/.test(unit)) months = Math.max(1, Math.round(n / 4.345));
  else months = n;
  return { value: months, span: [m.index, m.index + m[0].length], text: m[0] };
}

/** "month mein do-teen din", "2-3 days a month". Kept as text; ranges are never averaged. */
export function parseDaysPerMonth(s: string): Found<string> | null {
  const a = new RegExp(`(?:month|mahine|mahina|maheene)\\s*(?:mein|me|ke|mai)?\\s*${NUM}(?:\\s*(?:-|–|to|ya|or)\\s*${NUM})?\\s*(?:din|days?)`, 'i').exec(s);
  const b = new RegExp(`${NUM}(?:\\s*(?:-|–|to|ya|or)\\s*${NUM})?\\s*(?:din|days?)\\s*(?:a|per|every|har)\\s*(?:month|mahine|mahina)`, 'i').exec(s);
  const m = a ?? b;
  if (!m) return null;
  const lo = toNum(m[1]);
  const hi = m[2] ? toNum(m[2]) : null;
  if (lo === null) return null;
  const value = hi !== null && hi !== lo ? `${lo}–${hi}` : `${lo}`;
  return { value, span: [m.index, m.index + m[0].length], text: m[0] };
}

export function parsePattern(s: string): Found<string> | null {
  const m = /(har\s+(?:mahine|mahina|cycle|period)|every\s+(?:month|cycle|period)|each\s+(?:month|cycle)|हर\s*(?:महीने|माहवारी))/i.exec(s);
  return m ? { value: 'every cycle', span: [m.index, m.index + m[0].length], text: m[0] } : null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y: number, m: number, d: number) => `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Approximate dates. The original words are always kept in `text`.
 * Bounds are only added when the words actually pin them down.
 */
export function parseApproxDate(s: string, now: Date = new Date()): { text: string; earliest?: string; latest?: string } | null {
  const y = now.getUTCFullYear();
  let m: RegExpExecArray | null;

  if ((m = /diwali\s*(20\d{2})/i.exec(s))) {
    const yr = +m[1];
    return { text: m[0], earliest: iso(yr, 10, 1), latest: iso(yr, 11, 30) };
  }
  if ((m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d{2})/i.exec(s))) {
    const mo = MONTHS[m[1].toLowerCase().slice(0, 3)];
    const yr = +m[2];
    return { text: m[0], earliest: iso(yr, mo, 1), latest: iso(yr, mo, lastDay(yr, mo)) };
  }
  if ((m = /(?:since|from|around|in)\s+(20\d{2})/i.exec(s))) {
    const yr = +m[1];
    return { text: m[0], earliest: iso(yr, 1, 1), latest: iso(yr, 12, 31) };
  }
  if ((m = /(last year|pichhle saal|pichle saal|pichhli saal)/i.exec(s))) {
    return { text: m[0], earliest: iso(y - 1, 1, 1), latest: iso(y - 1, 12, 31) };
  }
  if ((m = new RegExp(`${NUM}\\s*(?:saal|years?)\\s*(?:pehle|ago)`, 'i').exec(s))) {
    const n = toNum(m[1]);
    if (n !== null) return { text: m[0], earliest: iso(y - n - 1, 1, 1), latest: iso(y - n + 1, 12, 31) };
  }
  if ((m = /(?:since|from|jab se|tab se)\s*(?:my\s*)?(?:\d{1,2}(?:st|nd|rd|th)|barvi|barahvi|dasvi)(?:\s*(?:grade|class|standard))?/i.exec(s))) return { text: m[0].trim() };
  if ((m = /(?:since|from)\s+(?:school|college|childhood|teens|puberty|first period|menarche)/i.exec(s))) return { text: m[0] };
  if ((m = /(?:jab se periods shuru hue|since my first period|from my first period)/i.exec(s))) return { text: m[0] };
  return null;
}

export function parseCycleLength(s: string): Found<number> | null {
  const m =
    /(\d{2})\s*(?:din|days?)\s*(?:ka|ke|ki)?\s*(?:cycle|gap)/i.exec(s) ||
    /cycle\s*(?:length\s*)?(?:is|of|hai)?\s*(?:around|about|lagbhag)?\s*(\d{2})\s*(?:din|days?)/i.exec(s) ||
    /(\d{2})\s*(?:din|days?)\s*(?:mein|me|baad|ke baad)\s*(?:ek baar|once|aate|aata)/i.exec(s) ||
    /every\s+(\d{2})\s*(?:days?)/i.exec(s);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (v < 10 || v > 120) return null;
  return { value: v, span: [m.index, m.index + m[0].length], text: m[0] };
}
