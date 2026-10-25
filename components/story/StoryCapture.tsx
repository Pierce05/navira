'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Empty } from '@/components/ui';
import { Recorder, recorderSupport } from '@/lib/voice/recorder';
import { defaultModel, transcribe, WHISPER_MODELS, type Job, type ModelChoice } from '@/lib/voice/transcribe';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import type { Lang } from '@/lib/db/models';

type Phase = 'idle' | 'recording' | 'transcribing';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const MAX_SECONDS = 120;

export function StoryCapture() {
  const t = useT();
  const router = useRouter();
  const { story, hydrated, consent, newStory, loadDemo, giveConsent, setTranscript, setStoryLang, extract } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [model, setModel] = useState<ModelChoice>('better');
  useEffect(() => { setModel(defaultModel(navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number })); }, []);
  const [announce, setAnnounce] = useState('');
  const rec = useRef<Recorder | null>(null);
  const job = useRef<Job | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const files = useRef<Record<string, number>>({});
  const area = useRef<HTMLTextAreaElement>(null);
  const support = typeof window === 'undefined' ? { ok: true as const } : recorderSupport();

  // /story/?demo=1 (linked from the landing page) loads the synthetic demo story; otherwise start an empty story.
  useEffect(() => {
    if (!hydrated) return;
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      giveConsent(); loadDemo();
      window.history.replaceState(null, '', '/story/');
      return;
    }
    if (!story) newStory('hinglish');
  }, [hydrated, story, newStory, loadDemo, giveConsent]);
  useEffect(() => () => { clearInterval(timer.current); cancelAnimationFrame(raf.current); rec.current?.cancel(); job.current?.cancel(); }, []);

  const draw = () => {
    const c = canvas.current, a = rec.current?.analyser;
    if (!c || !a) return;
    const g = c.getContext('2d')!;
    const data = new Uint8Array(a.fftSize);
    const loop = () => {
      a.getByteTimeDomainData(data);
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-strong').trim() || '#8F4A55';
      const bars = 48, w = c.width / bars;
      for (let i = 0; i < bars; i++) {
        const v = Math.abs(data[Math.floor((i / bars) * data.length)] - 128) / 128;
        const h = Math.max(3, v * c.height * 1.6);
        g.fillRect(i * w + 1, (c.height - h) / 2, w - 2, h);
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const toTyping = (msg: string) => { setNote(msg); setPhase('idle'); area.current?.focus(); };

  const start = async () => {
    setNote(null);
    if (!support.ok) return toTyping('Voice recording is not available in this browser. You can type your story instead.');
    try {
      rec.current = new Recorder();
      await rec.current.start();
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      return toTyping(denied ? 'The microphone is blocked. You can allow it in your browser settings, or type your story instead.' : 'Could not start the microphone. You can type your story instead.');
    }
    setPhase('recording'); setSecs(0); setAnnounce('Recording started');
    timer.current = setInterval(() => setSecs((s) => { if (s + 1 >= MAX_SECONDS) void stop(); return s + 1; }), 1000);
    draw();
  };

  const stop = async () => {
    clearInterval(timer.current); cancelAnimationFrame(raf.current);
    setPhase('transcribing'); setAnnounce('Recording stopped. Turning it into text on this device.');
    files.current = {}; setPct(0);
    try {
      const audio = await rec.current!.stop();
      job.current = transcribe(audio, story?.lang ?? 'hinglish', model, (p) => {
        if (p.file && typeof p.progress === 'number') { files.current[p.file] = p.progress; const v = Object.values(files.current); setPct(Math.round(v.reduce((a, b) => a + b, 0) / v.length)); }
      });
      const text = await job.current.promise;
      if (!text) return toTyping('We could not hear anything clear. Please try again or type your story.');
      setTranscript(((story?.transcript ? story.transcript + ' ' : '') + text).trim());
      setPhase('idle'); setPct(null); setAnnounce('Your words are ready to check below.');
      area.current?.focus();
    } catch (e) {
      if (e instanceof Error && e.message === 'cancelled') { setPct(null); return; }
      toTyping('Voice transcription is not available right now on this device. Your typed story works just as well.');
    }
  };

  const cancel = () => { job.current?.cancel(); toTyping('Cancelled. Nothing was saved. Files already downloaded are kept, so trying again continues from there. You can also just type your story.'); setPct(null); };

  const go = async () => {
    if (!story?.transcript.trim()) return;
    useStore.getState().scanText(story.transcript);
    await extract();
    router.push('/review/');
  };

  if (!hydrated) return <p className="text-muted" role="status">Loading…</p>;
  const recording = phase === 'recording';

  return (
    <div className="grid gap-6">
      {!consent ? <Card><p>Please read how your information is handled first. <Link className="text-accent-strong underline" href="/start/">Go to the privacy sheet</Link>.</p></Card> : null}
      <Card className="text-center">
        <h2 className="text-2xl sm:text-3xl">{t('micPrompt')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">Hindi and Hinglish transcripts can contain mistakes. You will check them before anything is saved.</p>
        <div className="my-6 flex flex-col items-center gap-4">
          <button
            type="button" onClick={recording ? stop : start} disabled={phase === 'transcribing'}
            aria-label={recording ? `Recording, ${fmt(secs)}. Press to stop.` : t('record')}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-accent-strong bg-surface2 text-ink disabled:opacity-50 ${recording ? 'breathe' : ''}`}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0">
              {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="50" cy="22" rx="10" ry="16" transform={`rotate(${r} 50 50)`} fill="var(--blush)" opacity="0.75" />)}
            </svg>
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-strong text-on-accent">
              {recording ? <span aria-hidden="true" className="h-5 w-5 rounded-sm bg-on-accent" /> : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              )}
            </span>
          </button>
          <p className="text-lg" aria-hidden="true">{recording ? `${fmt(secs)}` : phase === 'transcribing' ? 'Turning your words into text…' : t('record')}</p>
          <canvas ref={canvas} width={360} height={56} aria-hidden="true" className={`h-14 w-full max-w-sm ${recording ? '' : 'invisible'}`} />
          <p className="sr-only" role="status" aria-live="polite">{announce}</p>
        </div>

        {phase === 'transcribing' ? (
          <div className="mx-auto max-w-sm">
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? 0} aria-label="Speech model progress" className="h-3 overflow-hidden rounded-full border border-line">
              <div className="h-full bg-accent-strong" style={{ width: `${pct ?? 5}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{pct !== null && pct < 100 ? `Getting the speech model ready (${pct}%). This happens once.` : 'Almost done.'}</p>
            <Button variant="secondary" className="mt-3" onClick={cancel}>Cancel</Button>
          </div>
        ) : null}

        <details className="mx-auto mt-4 max-w-md text-left text-sm text-muted">
          <summary className="min-h-[44px] cursor-pointer py-2">About voice on this device</summary>
          <p>Speech is turned into text on this device. The first time, a speech model ({model === 'better' ? 'about 80 MB' : 'about 40 MB'}) is downloaded from its public host and kept for offline use. No audio or text is sent. Audio is discarded right after.</p>
          <label className="mt-2 block">Model{' '}
            <select value={model} onChange={(e) => setModel(e.target.value as ModelChoice)} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-ink">
              <option value="better">Better accuracy, slower ({WHISPER_MODELS.better.split('/')[1]})</option>
              <option value="fast">Faster, for phones and older laptops ({WHISPER_MODELS.fast.split('/')[1]})</option>
            </select>
          </label>
        </details>
        {note ? <p role="alert" className="mx-auto mt-4 max-w-md rounded-2xl border border-line p-3 text-left">{note}</p> : null}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label htmlFor="story" className="text-xl font-display font-semibold">{t('typeInstead')}</label>
          {story?.synthetic ? <Badge tone="warn">{t('synthetic')}: demo story, not a real person</Badge> : null}
          <label className="ml-auto flex items-center gap-2 text-sm">Language
            <select value={story?.lang ?? 'hinglish'} onChange={(e) => setStoryLang(e.target.value as Lang)} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-ink">
              <option value="en">English</option><option value="hi">हिंदी</option><option value="hinglish">Hinglish</option>
            </select>
          </label>
        </div>
        <textarea
          id="story" ref={area} value={story?.transcript ?? ''} onChange={(e) => setTranscript(e.target.value)} rows={7}
          placeholder="Write or edit your story here. Any language, any order."
          className="w-full rounded-2xl border border-line bg-surface p-4 text-lg text-ink placeholder:text-muted"
          lang={story?.lang === 'hi' ? 'hi' : undefined}
        />
        {!story?.transcript ? <div className="mt-3"><Empty text={t('emptyStory')} /></div> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={go} disabled={!story?.transcript.trim() || phase !== 'idle'}>{t('looksRight')}</Button>
          <p className="text-sm text-muted">Next, you will check each thing we picked up. Nothing is saved as fact until you confirm it.</p>
        </div>
      </Card>
    </div>
  );
}
