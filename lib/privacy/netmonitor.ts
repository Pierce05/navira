/**
 * Network indicator. Wraps fetch / XHR / sendBeacon / WebSocket and classifies every request.
 *  - assets:       same-origin GET with no body (app shell, fonts, wasm). No server code exists to receive user data.
 *  - modelWeights: GET (no body) to the speech-model host. Disclosed. Carries no user content.
 *  - userContent:  anything else that could carry user content: any non-GET, any body, any beacon/socket,
 *                  or any GET to another origin. Mode A must read 0.
 */
export interface NetEntry { at: number; kind: 'asset' | 'modelWeights' | 'userContent'; method: string; target: string }
export interface NetCounts { userContent: number; assets: number; modelWeights: number; log: NetEntry[] }

const MODEL_HOSTS = ['huggingface.co', 'hf.co'];
const extra = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MODEL_HOST : undefined;

let counts: NetCounts = { userContent: 0, assets: 0, modelWeights: 0, log: [] };
const listeners = new Set<() => void>();
let installed = false;
const emit = () => { counts = { ...counts, log: [...counts.log] }; listeners.forEach((l) => l()); };

export function classify(rawUrl: string, method: string, hasBody: boolean, origin = typeof location !== 'undefined' ? location.origin : 'http://localhost'): NetEntry['kind'] {
  let u: URL;
  try { u = new URL(rawUrl, origin); } catch { return 'userContent'; }
  const m = method.toUpperCase();
  const plainGet = (m === 'GET' || m === 'HEAD') && !hasBody;
  if (!plainGet) return 'userContent';
  if (u.origin === origin || (u.protocol === 'ws:' || u.protocol === 'wss:') && u.host === new URL(origin).host) return 'asset';
  if (u.protocol === 'data:' || u.protocol === 'blob:') return 'asset';
  const host = u.hostname;
  const modelHost = [...MODEL_HOSTS, ...(extra ? [new URL(extra, origin).hostname] : [])];
  if (modelHost.some((h) => host === h || host.endsWith(`.${h}`))) return 'modelWeights';
  return 'userContent';
}

function record(kind: NetEntry['kind'], method: string, target: string) {
  if (kind === 'userContent') counts.userContent++;
  else if (kind === 'asset') counts.assets++;
  else counts.modelWeights++;
  counts.log.push({ at: Date.now(), kind, method, target: target.slice(0, 120) });
  if (counts.log.length > 200) counts.log.shift();
  emit();
}

/** Used by the main thread to log requests reported by the Whisper worker (workers have their own fetch). */
export function recordRemote(kind: NetEntry['kind'], method: string, target: string) { record(kind, method, target); }

export function installNetMonitor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null;
    const url = req ? req.url : String(input instanceof URL ? input.href : input);
    const method = init?.method ?? req?.method ?? 'GET';
    const hasBody = init?.body != null || (req ? req.body != null : false);
    record(classify(url, method, hasBody), method, url);
    return origFetch(input as RequestInfo, init);
  };

  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __n?: { m: string; u: string } }, method: string, url: string | URL, ...rest: unknown[]) {
    this.__n = { m: method, u: String(url) };
    // @ts-expect-error variadic passthrough
    return XO.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __n?: { m: string; u: string } }, body?: Document | XMLHttpRequestBodyInit | null) {
    if (this.__n) record(classify(this.__n.u, this.__n.m, body != null), this.__n.m, this.__n.u);
    return XS.call(this, body as XMLHttpRequestBodyInit | null);
  };

  if (navigator.sendBeacon) {
    const ob = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => { record('userContent', 'BEACON', String(url)); return ob(url, data); };
  }
  const OW = window.WebSocket;
  window.WebSocket = class extends OW {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      record(classify(String(url), 'GET', false), 'WS', String(url));
    }
  } as typeof WebSocket;
}

export const getNetCounts = () => counts;
export const subscribeNet = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const resetNetCounts = () => { counts = { userContent: 0, assets: 0, modelWeights: 0, log: [] }; emit(); };
