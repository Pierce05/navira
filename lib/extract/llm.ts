/**
 * OPTIONAL on-device LLM refinement (flag: NEXT_PUBLIC_ENABLE_LLM=1). Never required: on ANY failure we silently
 * fall back to the lexicon result. Output is validated with Zod; invalid output is discarded.
 */
import type { Fact } from '@/lib/db/models';
import { LlmOutputSchema } from './schema';

export const LLM_ENABLED = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_LLM === '1';
const MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const ALLOWED = ['pelvic_pain', 'dyspareunia', 'bowel_pain', 'urinary_pain', 'heavy_bleeding', 'fatigue', 'hair_thinning', 'acne', 'hirsutism', 'irregular_cycles', 'family_history', 'prior_evaluation'];

export async function refineWithLlm(transcript: string, lexiconFacts: Fact[], onProgress?: (p: string) => void): Promise<Fact[]> {
  if (!LLM_ENABLED || typeof navigator === 'undefined' || !('gpu' in navigator)) return lexiconFacts;
  try {
    const webllm = await import('@mlc-ai/web-llm');
    const engine = await webllm.CreateMLCEngine(MODEL, { initProgressCallback: (r) => onProgress?.(r.text) });
    const reply = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: `Extract ONLY facts the speaker explicitly states. Reply with JSON only: {"facts":[{"key":one of ${ALLOWED.join('|')},"value":true,"evidence":"exact words"}]}. Never infer. Never diagnose.` },
        { role: 'user', content: transcript },
      ],
      temperature: 0, max_tokens: 400,
    });
    const raw = reply.choices[0]?.message?.content ?? '';
    const parsed = LlmOutputSchema.safeParse(JSON.parse(raw.replace(/```json|```/g, '').trim()));
    if (!parsed.success) return lexiconFacts;
    const have = new Set(lexiconFacts.map((f) => f.key));
    const added: Fact[] = parsed.data.facts
      .filter((f) => ALLOWED.includes(f.key) && !have.has(f.key) && f.evidence && transcript.toLowerCase().includes(f.evidence.toLowerCase()))
      .map((f, i) => ({
        id: `llm${Date.now().toString(36)}${i}`, kind: 'symptom' as const, key: f.key, value: f.value, label: `${f.key.replace(/_/g, ' ')} (suggested by on-device model: please check)`,
        evidence: f.evidence, provenance: 'system_interpretation' as const, status: 'unconfirmed' as const, needsCheck: true,
      }));
    return [...lexiconFacts, ...added];
  } catch {
    return lexiconFacts;
  }
}
