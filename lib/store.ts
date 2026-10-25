'use client';
import { create } from 'zustand';
import { db } from '@/lib/db/dexie';
import type { Fact, Lang, Story } from '@/lib/db/models';
import { extractFacts } from '@/lib/extract/lexicon';
import { refineWithLlm } from '@/lib/extract/llm';
import { scanRedFlags, type RedFlagHit } from '@/lib/rules/redflags';
import type { UiLang } from '@/lib/i18n';
import { DEMO_LANG, DEMO_TRANSCRIPT } from '@/lib/demo';

export type Theme = 'system' | 'light' | 'dark';
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

interface Session {
  hydrated: boolean;
  uiLang: UiLang;
  theme: Theme;
  consent: boolean;
  story: Story | null;
  questions: string[] | null;
  notes: string;
  initials: string;
  excerpt: string | null;
  includeSafety: boolean;
  /** red-flag interrupt currently on screen */
  interrupt: RedFlagHit[] | null;
  /** every flag seen this story (for the brief's safety note) */
  flagLog: { id: string; label: string; category: string }[];
  dismissed: string[];
}

interface Actions {
  hydrate: () => Promise<void>;
  setUiLang: (l: UiLang) => void;
  setTheme: (t: Theme) => void;
  giveConsent: () => void;
  newStory: (lang: Lang, transcript?: string, synthetic?: boolean) => void;
  setTranscript: (t: string) => void;
  setStoryLang: (l: Lang) => void;
  loadDemo: () => void;
  extract: () => Promise<void>;
  setFacts: (f: Fact[]) => void;
  patchFact: (id: string, p: Partial<Fact>) => void;
  removeFact: (id: string) => void;
  addFact: (f: Omit<Fact, 'id' | 'status'> & { status?: Fact['status'] }) => void;
  confirmFacts: (ids: string[]) => void;
  confirmAll: () => void;
  addAnswerFacts: (f: Fact[]) => void;
  markAsked: (key: string) => void;
  finishFollowups: () => void;
  setBriefFields: (p: Partial<Pick<Session, 'questions' | 'notes' | 'initials' | 'excerpt' | 'includeSafety'>>) => void;
  scanText: (text: string) => RedFlagHit[];
  resolveInterrupt: (action: 'dismissed' | 'continue_later') => Promise<void>;
  persist: () => Promise<void>;
  resetSession: () => void;
}

export const useStore = create<Session & Actions>((set, get) => ({
  hydrated: false, uiLang: 'en', theme: 'system', consent: false, story: null, questions: null, notes: '', initials: '',
  excerpt: null, includeSafety: true, interrupt: null, flagLog: [], dismissed: [],

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const ui = localStorage.getItem('navira.uiLang') as UiLang | null;
      const th = localStorage.getItem('navira.theme') as Theme | null;
      const consent = localStorage.getItem('navira.consent') === '1';
      const last = await db().stories.orderBy('createdAt').last();
      const meta = await db().meta.get('session');
      const m = (meta?.value ?? {}) as Partial<Session>;
      set({ uiLang: ui ?? 'en', theme: th ?? 'system', consent, story: last ?? null, questions: m.questions ?? null, notes: m.notes ?? '', initials: m.initials ?? '', excerpt: m.excerpt ?? null, flagLog: m.flagLog ?? [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setUiLang: (l) => { localStorage.setItem('navira.uiLang', l); document.documentElement.lang = l; set({ uiLang: l }); },
  setTheme: (t) => {
    localStorage.setItem('navira.theme', t);
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
  giveConsent: () => { localStorage.setItem('navira.consent', '1'); set({ consent: true }); },

  newStory: (lang, transcript = '', synthetic = false) => {
    set({ story: { id: uid(), createdAt: new Date().toISOString(), lang, transcript, facts: [], synthetic, askedKeys: [], followupsDone: false }, questions: null, notes: '', excerpt: null, flagLog: [], dismissed: [], interrupt: null });
    void get().persist();
  },
  setTranscript: (t) => {
    const s = get().story; if (!s) return;
    set({ story: { ...s, transcript: t } });
    get().scanText(t);
  },
  setStoryLang: (l) => { const s = get().story; if (s) { set({ story: { ...s, lang: l } }); void get().persist(); } },
  loadDemo: () => {
    get().newStory(DEMO_LANG, DEMO_TRANSCRIPT, true);
  },
  extract: async () => {
    const s = get().story; if (!s) return;
    const base = extractFacts(s.transcript);
    const facts = await refineWithLlm(s.transcript, base);
    set({ story: { ...s, facts } });
    await get().persist();
  },
  setFacts: (facts) => { const s = get().story; if (s) { set({ story: { ...s, facts } }); void get().persist(); } },
  patchFact: (id, p) => { const s = get().story; if (s) get().setFacts(s.facts.map((f) => (f.id === id ? { ...f, ...p } : f))); },
  removeFact: (id) => { const s = get().story; if (s) get().setFacts(s.facts.filter((f) => f.id !== id)); },
  addFact: (f) => { const s = get().story; if (s) get().setFacts([...s.facts, { ...f, id: uid(), status: f.status ?? 'unconfirmed' } as Fact]); },
  confirmFacts: (ids) => {
    const s = get().story; if (!s) return;
    const set_ = new Set(ids);
    set({ story: { ...s, confirmedAt: new Date().toISOString(), facts: s.facts.map((f) => (set_.has(f.id) ? { ...f, status: 'confirmed', needsCheck: false } : f)) } });
    void get().persist();
  },
  /** Confirms every pending fact EXCEPT ones flagged needsCheck: those need a deliberate tap. */
  confirmAll: () => {
    const s = get().story; if (!s) return;
    get().confirmFacts(s.facts.filter((f) => f.status === 'unconfirmed' && !f.needsCheck).map((f) => f.id));
  },
  addAnswerFacts: (fs) => { const s = get().story; if (s) get().setFacts([...s.facts.filter((f) => !fs.some((n) => n.key === f.key && f.status !== 'confirmed')), ...fs]); },
  markAsked: (key) => { const s = get().story; if (s && !s.askedKeys.includes(key)) { set({ story: { ...s, askedKeys: [...s.askedKeys, key] } }); void get().persist(); } },
  finishFollowups: () => { const s = get().story; if (s) { set({ story: { ...s, followupsDone: true } }); void get().persist(); } },
  setBriefFields: (p) => { set(p); void get().persist(); },

  scanText: (text) => {
    const hits = scanRedFlags(text);
    if (!hits.length) return hits;
    const { dismissed, flagLog } = get();
    const fresh = hits.filter((h) => !dismissed.includes(h.id));
    const log = [...flagLog];
    for (const h of hits) if (!log.some((l) => l.id === h.id)) log.push({ id: h.id, label: h.label, category: h.category });
    set({ flagLog: log, interrupt: fresh.length ? fresh : get().interrupt });
    return hits;
  },
  resolveInterrupt: async (action) => {
    const cur = get().interrupt; if (!cur) return;
    try { for (const h of cur) await db().interruptions.add({ id: uid(), at: new Date().toISOString(), flagId: h.id, action }); } catch { /* best effort */ }
    set({ interrupt: null, dismissed: [...get().dismissed, ...cur.map((h) => h.id)] });
    await get().persist();
  },
  persist: async () => {
    const { story, questions, notes, initials, excerpt, flagLog } = get();
    try {
      if (story) await db().stories.put(story);
      await db().meta.put({ key: 'session', value: { questions, notes, initials, excerpt, flagLog } });
    } catch { /* storage unavailable: app still works in memory */ }
  },
  resetSession: () => set({ story: null, questions: null, notes: '', initials: '', excerpt: null, flagLog: [], dismissed: [], interrupt: null, consent: false }),
}));
