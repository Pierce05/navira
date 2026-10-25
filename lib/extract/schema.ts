import { z } from 'zod';

export const FactSchema = z.object({
  id: z.string(),
  kind: z.enum(['symptom', 'timing', 'severity', 'impact', 'treatment', 'history', 'evaluation', 'cycle']),
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  unit: z.string().optional(),
  approxDate: z.object({ text: z.string(), earliest: z.string().optional(), latest: z.string().optional() }).optional(),
  severity0to10: z.number().min(0).max(10).optional(),
  cycleRelation: z.enum(['before', 'during', 'after', 'any', 'unknown']).optional(),
  sourceSpan: z.tuple([z.number(), z.number()]).optional(),
  provenance: z.enum(['patient_reported', 'system_interpretation']),
  status: z.enum(['confirmed', 'unconfirmed', 'unknown']),
  label: z.string().optional(),
  evidence: z.string().optional(),
  needsCheck: z.boolean().optional(),
});

/** Shape the optional on-device LLM must return. Anything else is discarded. */
export const LlmFactSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  cycleRelation: z.enum(['before', 'during', 'after', 'any', 'unknown']).optional(),
  severity0to10: z.number().min(0).max(10).optional(),
  evidence: z.string().optional(),
});
export const LlmOutputSchema = z.object({ facts: z.array(LlmFactSchema).max(40) });
export type LlmOutput = z.infer<typeof LlmOutputSchema>;
