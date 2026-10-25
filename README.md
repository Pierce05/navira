# Navira
**Team hollanov** · Purvanshi Khandelwal · Manasvi Khandelwal · recHERsion'26, PS1: Women's Healthcare
Live: [add after deploy] · Demo video: [add later]
> Hackathon snapshot. Rules and red-flag wording are drafts pending clinician review. Not a medical device. Not a diagnosis.

A privacy-first, installable web app (PWA) that turns a spoken or typed symptom story (English, Hindi, Hinglish) into a **clinician-ready one-page PDF brief**. Built for recHERsion'26 PS1 (Women's Healthcare).

It **never diagnoses and never outputs a score or percentage.** Rule outputs are "features commonly considered in evaluation" plus an explicit "not yet known" list. Nothing enters the record until the person confirms it.

> Rules and red-flag text are **drafts pending clinician review** (`"reviewStatus": "draft"`). Do not present them as clinically validated.

## Run it

```bash
npm install            # also copies self-hosted fonts + ONNX wasm into /public
npm test               # 156 unit/integration tests (Vitest)
npm run build          # static export to ./out (+ service worker with precache list)
npm run serve          # http://localhost:3000
npm run dev            # development server
npx playwright install chromium && npm run test:e2e   # e2e (needs `npm run build` first)
npm run demo-pdf       # writes demo-brief.pdf from the synthetic demo story
```

Node 20+. There is **no backend**; `./out` is plain static files you can host anywhere (Netlify, GitHub Pages, S3).

## Product flow

`/` is the standalone landing page (`public/index.html`; its CTAs go to `/start/`, and `/story/?demo=1` loads the synthetic demo). Then `/start` (consent + data-flow table + language) → `/story` (voice or typed, editable transcript) → `/review` (editable fact chips, confirm) → `/followups` (≤5 skippable questions) → `/timeline` → `/brief` (preview, edit, PDF, print) → `/privacy` (live Network indicator, export/import, delete-all). `/safety` and a "Need urgent help?" link are always reachable.

"Use demo story" loads the synthetic Hinglish script (labelled SYNTHETIC) and doubles as the fallback if mic or model fails.

## Privacy architecture (Mode A, the default)

| Step | Where it runs |
|---|---|
| Audio | `MediaRecorder` → decoded to 16 kHz in memory → Blob dropped immediately |
| Transcription | Whisper (tiny/base multilingual) via transformers.js in a **Web Worker**, WASM |
| Extraction | Deterministic EN/HI/Hinglish lexicon (`lib/extract`). Works with **no LLM** |
| Rules | JSON packs evaluated locally (`lib/rules`). Red-flag scan is regex, offline, runs first |
| Storage | IndexedDB via Dexie. No accounts, no analytics, no third-party scripts |
| Fonts / wasm | Self-hosted from `/public` (no CDN) |
| Export | User-initiated download only; optional AES-GCM passphrase |

The **only outside download** is the speech model (from the public model host, once, then cached). It carries no user content and is disclosed in the UI.

The footer **Network indicator** (`lib/privacy/netmonitor.ts`) wraps `fetch`, XHR, `sendBeacon`, `WebSocket` (and reports the Whisper worker's `fetch`). It classifies each request as *asset* (same-origin GET), *model weights* (GET to the model host) or *user content* (anything that sends a body, any non-GET, any beacon/socket, any GET to another origin). Mode A must read **0**.

Claim used in the UI: *"Your voice and story are processed and stored on this device."* We do not claim "never leaves your device" because the model download exists.

To self-host the model files and remove even that dependency, set `NEXT_PUBLIC_MODEL_HOST` (see `.env.example`).

## Rules and how they are versioned

- `rules/endometriosis.json`, `rules/pcos.json`: `{ version, reviewStatus, reviewedBy, rules: [ { id, pathway, when, outputs{patientText, clinicianText}, source{name,url,section,version} } ] }`.
- `when` is declarative over **confirmed** facts: `all` / `any` / `none` of `{ fact, exists | gte | lte | gt | lt | eq | in | cycleIn }`.
- Each fired rule exposes `reasonFactIds` (shown as "Why this appeared") and its source.
- No rule uses weight, BMI or appearance (enforced by a test).
- `rules/redflags.json`: urgent categories + self-harm; each is a set of regex groups that must all match, with a negation guard ("no fainting").
- Bump `version` on any edit; the brief footer prints all versions and "clinician review pending" until a human signs off. Set `reviewedBy` only after sign-off, and update the "Rules reviewed by: [pending]" line on `/privacy`.

## Clinical sources (verify links and sections before launch)

NICE NG73 Endometriosis; ESHRE Endometriosis Guideline (2022); International Evidence-based Guideline for PCOS (2023); WHO PCOS fact sheet.

## Tests

- Red flags: 23 positive and 18 negative phrases across EN / Hindi / Hinglish.
- Extraction: a **development set** (10 narratives, written with the lexicon: optimistic) and a **held-out set** (5 narratives) are scored and printed separately by `npm test`. Do not quote the development number as accuracy.
- Rules, missing-info, follow-ups, brief page-count (demo, sparse, empty, rich, Devanagari: all exactly one A4 page), contrast for every token pairing in both themes, forbidden-language scanner, network classification, export/import crypto, and an integration test of the whole journey through the real store + IndexedDB + delete-all.
- Playwright specs in `test/e2e` (journey, landing, safety, privacy/delete/theme, offline, mobile, voice): **written but not yet run**. See `PROGRESS.md`.

## Known limitations

See `PROGRESS.md` ("Not verified here", "Cut", "Claims to verify"). Highlights: Whisper has never been run or timed; held-out extraction accuracy is about 73%; the lexicon is hand-written; UI Hindi covers chrome only; the brief is English; Mode B and "what changed" are not built.
