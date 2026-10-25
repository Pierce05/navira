/** Data-driven evaluator. Only CONFIRMED facts count. Outputs are features and gaps, never conclusions. */
import type { CycleRelation, Fact, RuleResult } from '@/lib/db/models';
import endo from '@/rules/endometriosis.json';
import pcos from '@/rules/pcos.json';
import { KEY_NAMES } from './names';

export interface Cond {
  fact: string; exists?: boolean; gte?: number; lte?: number; gt?: number; lt?: number;
  eq?: string | number | boolean; in?: (string | number)[]; cycleIn?: CycleRelation[];
}
export interface Rule {
  id: string; pathway: 'endometriosis' | 'pcos';
  when: { all?: Cond[]; any?: Cond[]; none?: Cond[] };
  outputs: { patientText: string; clinicianText: string };
  source: RuleResult['source'];
}
export interface RulePack { pack: string; version: string; reviewStatus: string; reviewedBy: string | null; rules: Rule[] }

export const PACKS: RulePack[] = [endo as unknown as RulePack, pcos as unknown as RulePack];
export const RULES_VERSION = PACKS.map((p) => `${p.pack} ${p.version}`).join(' · ');

/** True only when EVERY loaded pack is marked reviewed AND names a reviewer. Until then the brief carries a draft notice. */
export function rulesReviewed(packs: RulePack[] = PACKS): boolean {
  return packs.length > 0 && packs.every((p) => p.reviewStatus === 'reviewed' && !!p.reviewedBy);
}

export const isConfirmed = (f: Fact) => f.status === 'confirmed' && f.value !== null && f.value !== undefined;
/** "Present" means reported and not explicitly denied. */
const present = (f: Fact | undefined): f is Fact => !!f && isConfirmed(f) && f.value !== false;

export function confirmedMap(facts: Fact[]): Map<string, Fact> {
  const m = new Map<string, Fact>();
  for (const f of facts) if (isConfirmed(f)) m.set(f.key, f);
  return m;
}

/** Cycle relation may be set on the fact itself or by a confirmed `<key>_cycle` follow-up answer. */
export function cycleRelationOf(facts: Map<string, Fact>, key: string): CycleRelation {
  const own = facts.get(key)?.cycleRelation;
  const extra = facts.get(`${key}_cycle`);
  if (extra && typeof extra.value === 'string') return extra.value as CycleRelation;
  return own ?? 'unknown';
}

function holds(c: Cond, facts: Map<string, Fact>, used: Set<string>): boolean {
  const f = facts.get(c.fact);
  if (c.exists === false) return !present(f);
  if (!present(f)) return false;
  const num = typeof f.value === 'number' ? f.value : Number(f.value);
  const finite = Number.isFinite(num);
  if (c.gte !== undefined && !(finite && num >= c.gte)) return false;
  if (c.lte !== undefined && !(finite && num <= c.lte)) return false;
  if (c.gt !== undefined && !(finite && num > c.gt)) return false;
  if (c.lt !== undefined && !(finite && num < c.lt)) return false;
  if (c.eq !== undefined && f.value !== c.eq) return false;
  if (c.in && !c.in.includes(f.value as string | number)) return false;
  if (c.cycleIn && !c.cycleIn.includes(cycleRelationOf(facts, c.fact))) return false;
  used.add(f.id);
  return true;
}

function fill(template: string, facts: Map<string, Fact>): string {
  return template
    .replace(/\{names:([a-z_|]+)\}/g, (_, list: string) => {
      const names = list.split('|').filter((k) => present(facts.get(k))).map((k) => KEY_NAMES[k] ?? k);
      return names.length ? names.join(', ') : 'none stated';
    })
    // {key:unit} renders "24 months", or "not stated" when the fact is missing or unknown (never "undefined"/"null")
    .replace(/\{([a-z_]+):([a-z/ ]+)\}/g, (_, k: string, unit: string) => {
      const f = facts.get(k);
      return f && f.value !== null && f.value !== true && f.value !== false ? `${String(f.value)} ${unit}` : 'not stated';
    })
    .replace(/\{([a-z_]+)\}/g, (_, k: string) => {
      const f = facts.get(k);
      return f && f.value !== null && f.value !== true && f.value !== false ? String(f.value) : 'not stated';
    });
}

export function evaluateRules(allFacts: Fact[], packs: RulePack[] = PACKS): RuleResult[] {
  const facts = confirmedMap(allFacts);
  const out: RuleResult[] = [];
  for (const pack of packs) for (const r of pack.rules) {
    const used = new Set<string>();
    const w = r.when;
    const all = (w.all ?? []).every((c) => holds(c, facts, used));
    let any = true;
    if (w.any && w.any.length) {
      any = false;
      for (const c of w.any) if (holds(c, facts, used)) any = true; // evaluate all so reasons are complete
    }
    const none = (w.none ?? []).every((c) => !holds(c, facts, new Set()));
    const fired = all && any && none;
    out.push({
      ruleId: r.id, pathway: r.pathway, fired, reasonFactIds: fired ? [...used] : [],
      text: fired ? fill(r.outputs.clinicianText, facts) : '', patientText: fired ? r.outputs.patientText : '', source: r.source,
    });
  }
  return out;
}

export const firedRules = (facts: Fact[]) => evaluateRules(facts).filter((r) => r.fired);
