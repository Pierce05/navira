/** Mic capture. Audio stays in memory only; it is decoded to 16 kHz mono and the Blob is dropped immediately. */
export type RecorderSupport = { ok: true } | { ok: false; reason: 'no-mediadevices' | 'no-mediarecorder' };

export function recorderSupport(): RecorderSupport {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'no-mediadevices' };
  if (typeof MediaRecorder === 'undefined') return { ok: false, reason: 'no-mediarecorder' };
  return { ok: true };
}

export class Recorder {
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];
  private ctx?: AudioContext;
  analyser?: AnalyserNode;
  startedAt = 0;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start(250);
    this.startedAt = Date.now();
  }

  /** Stops, decodes to Float32 @16 kHz, and discards the raw audio. */
  async stop(): Promise<Float32Array> {
    const rec = this.rec!;
    const done = new Promise<void>((res) => { rec.onstop = () => res(); });
    rec.stop();
    await done;
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();
    let blob: Blob | null = new Blob(this.chunks, { type: rec.mimeType });
    this.chunks = [];
    const buf = await blob.arrayBuffer();
    blob = null; // raw audio no longer referenced
    return decodeTo16k(buf);
  }

  cancel() {
    try { this.rec?.state !== 'inactive' && this.rec?.stop(); } catch { /* ignore */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.chunks = [];
  }
}

export async function decodeTo16k(buf: ArrayBuffer): Promise<Float32Array> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf.slice(0));
  await ctx.close();
  const frames = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, frames, 16000);
  const s = off.createBufferSource();
  s.buffer = decoded;
  s.connect(off.destination);
  s.start();
  const out = await off.startRendering();
  return out.getChannelData(0).slice();
}
