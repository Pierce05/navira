import type { Lang } from '@/lib/db/models';
import { recordRemote } from '@/lib/privacy/netmonitor';

export const WHISPER_MODELS = { fast: 'Xenova/whisper-tiny', better: 'Xenova/whisper-base' } as const;
export type ModelChoice = keyof typeof WHISPER_MODELS;
export interface TranscribeProgress { status: string; file?: string; progress?: number }

/**
 * Conservative default: the smaller model on phones and low-end laptops (4 or fewer cores, or 4 GB or less of RAM).
 * This is a hardware rule, not a measured timing: whisper-base has not been timed on a real device yet (see PROGRESS.md).
 */
export function defaultModel(n: { hardwareConcurrency?: number; deviceMemory?: number } | undefined): ModelChoice {
  const cores = n?.hardwareConcurrency ?? 8;
  const mem = n?.deviceMemory ?? 8;
  return cores <= 4 || mem <= 4 ? 'fast' : 'better';
}

const LANG: Record<Lang, string | undefined> = { en: 'english', hi: 'hindi', hinglish: undefined };

export interface Job { promise: Promise<string>; cancel: () => void }

/** Runs Whisper in a worker. `cancel()` terminates it (also frees memory on low-end phones). */
export function transcribe(audio: Float32Array, lang: Lang, model: ModelChoice, onProgress: (p: TranscribeProgress) => void): Job {
  const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  let rejectFn: (e: Error) => void = () => undefined;
  const promise = new Promise<string>((resolve, reject) => {
    rejectFn = reject;
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'net') recordRemote(m.kind, m.method, m.target);
      else if (m.type === 'progress') onProgress(m);
      else if (m.type === 'result') { resolve(m.text); worker.terminate(); }
      else if (m.type === 'error') { reject(new Error(m.message)); worker.terminate(); }
    };
    worker.onerror = (e) => { reject(new Error(e.message || 'worker failed')); worker.terminate(); };
    worker.postMessage({ type: 'transcribe', model: WHISPER_MODELS[model], audio, language: LANG[lang] }, [audio.buffer]);
  });
  return { promise, cancel: () => { worker.terminate(); rejectFn(new Error('cancelled')); } };
}
