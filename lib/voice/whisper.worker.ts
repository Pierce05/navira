/// <reference lib="webworker" />
/**
 * On-device Whisper in a Web Worker (transformers.js, WASM). No audio or text leaves the device.
 * Only the model files are fetched (once) from the model host and cached by the browser.
 * ONNX wasm is served from /ort (self-hosted), not a CDN.
 */
import { env, pipeline } from '@xenova/transformers';
import { classify } from '@/lib/privacy/netmonitor';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = '/ort/';
env.backends.onnx.wasm.numThreads = 1; // no SharedArrayBuffer / cross-origin isolation needed
const HOST = process.env.NEXT_PUBLIC_MODEL_HOST;
if (HOST) env.remoteHost = HOST;

// Workers have their own fetch: classify every request here and report it to the main thread's Network indicator.
const workerFetch = self.fetch.bind(self);
self.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const req = input instanceof Request ? input : null;
  const url = req ? req.url : String(input instanceof URL ? input.href : input);
  const method = init?.method ?? req?.method ?? 'GET';
  const hasBody = init?.body != null || (req ? req.body != null : false);
  postMessage({ type: 'net', kind: classify(url, method, hasBody, self.location.origin), method, target: url });
  return workerFetch(input as RequestInfo, init);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null;
let loadedModel = '';

async function load(model: string) {
  if (asr && loadedModel === model) return;
  asr = await pipeline('automatic-speech-recognition', model, {
    progress_callback: (p: { status: string; file?: string; progress?: number }) => postMessage({ type: 'progress', ...p }),
  });
  loadedModel = model;
}

self.onmessage = async (e: MessageEvent<{ type: string; model: string; audio?: Float32Array; language?: string }>) => {
  const { type, model, audio, language } = e.data;
  try {
    if (type === 'load') { await load(model); postMessage({ type: 'ready' }); return; }
    if (type === 'transcribe' && audio) {
      await load(model);
      const opts: Record<string, unknown> = { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' };
      if (language) opts.language = language; // undefined = auto-detect (used for Hinglish)
      const out = await asr(audio, opts);
      postMessage({ type: 'result', text: String(out.text ?? '').trim() });
    }
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
export {};
