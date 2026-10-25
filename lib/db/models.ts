export type Provenance = 'patient_reported' | 'system_interpretation';
export type Confidence = 'confirmed' | 'unconfirmed' | 'unknown';
export type Lang = 'en' | 'hi' | 'hinglish';
export type CycleRelation = 'before' | 'during' | 'after' | 'any' | 'unknown';
export type FactKind = 'symptom' | 'timing' | 'severity' | 'impact' | 'treatment' | 'history' | 'evaluation' | 'cycle';

export interface Fact {
  id: string;
  kind: FactKind;
  key: string;
  value: string | number | boolean | null;
  unit?: string;
  approxDate?: { text: string; earliest?: string; latest?: string };
  severity0to10?: number;
  cycleRelation?: CycleRelation;
  sourceSpan?: [number, number];
  provenance: Provenance;
  status: Confidence;
  /** Plain-language chip label. */
  label?: string;
  /** Exact words from the story that produced this candidate. */
  evidence?: string;
  /** Candidate carries something filled in from context; must be confirmed one by one. */
  needsCheck?: boolean;
}

export interface Story {
  id: string;
  createdAt: string;
  lang: Lang;
  transcript: string;
  facts: Fact[];
  synthetic?: boolean;
  /** keys the person was asked about and skipped or answered "not sure" */
  askedKeys: string[];
  followupsDone: boolean;
  confirmedAt?: string;
  excerpt?: string;
}

export interface RuleResult {
  ruleId: string;
  pathway: 'endometriosis' | 'pcos';
  fired: boolean;
  reasonFactIds: string[];
  text: string;
  patientText: string;
  source: { name: string; url: string; section?: string; version: string };
}

export interface BriefRecord {
  id: string;
  storyIds: string[];
  generatedAt: string;
  rulesVersion: string;
  notes?: string;
  questions: string[];
}

export interface InterruptionLog { id: string; at: string; flagId: string; action: 'dismissed' | 'continue_later' }
