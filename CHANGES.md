# CHANGES (fixes A to G)

Status key: **done** = implemented and covered by a passing unit test or build check in this sandbox. Browser-level behaviour is called out where it was not run.

## A. Landing at `/`: done (browser behaviour not run)
- Removed `app/page.tsx`. Landing copied to `public/index.html`. The production build succeeds without a root page and `out/index.html` is byte-identical to the landing (no conflict). No `/about/` page: the old home had nothing the landing lacks.
- Landing patched minimally (`public/index.html`): shared storage keys `navira.theme` (`light` / `dark` / `system`) and `navira.uiLang` (`en` / `hi`); a stored `system` is respected and is not overwritten just by loading the page; CTAs go to `/start/`; a "try it with a synthetic demo story" link to `/story/?demo=1`; language choice persists and is re-applied on load; registers the shared service worker so `/` works offline after a first visit; "risk scores" reworded; "language model" corrected to "speech model".
- `/story/?demo=1` loads the SYNTHETIC story, records consent as the "Use demo story" button does, and cleans the URL.
- Service worker precaches `/` and `/start/` (checked in the built list). Offline behaviour **not run in a browser**.
- Tests: `test/unit/landing.test.ts` (keys, links, no external resources, no forbidden language, accurate model wording, SW registration); e2e in `test/e2e/landing.spec.ts` (**written, not run**).
- Files: `public/index.html`, `app/page.tsx` (deleted), `components/story/StoryCapture.tsx`, `test/unit/landing.test.ts`, `test/unit/language.test.ts`, `test/e2e/landing.spec.ts`.

## B. Self-harm vs negation guard: done
- Guard applies to `urgent` only; never to `selfharm`. `\bna\b` removed. New tests: "I don't think I want to die", "main marna chahti hu", hedged phrases trigger; "no fainting with the pain" and "I'm not pregnant but I have pain" do not. The previous negative case "I am not suicidal, just tired" now triggers by design (moved to positives).
- Support card shows both numbers and "Please check these numbers are current in your area" (overlay and `/safety`). The "verify before launch" code comment is kept.
- Follow-ups are tap-only, so there is nothing free-text to scan there (documented in `PROGRESS.md`).
- Files: `lib/rules/redflags.ts`, `components/safety/RedFlagOverlay.tsx`, `app/safety/page.tsx`, `test/unit/redflags.test.ts`.

## C. "(verify)" out of the brief: done
- `(verify)` stays in the rule JSON; stripped at render time from the brief model (preview, PDF, print). New footer line "Rule wording is a draft pending clinician review." appears until every pack has `reviewStatus: "reviewed"` and a non-null `reviewedBy` (tests cover reviewed, missing name, and one-pack-draft).
- `docs/demo-brief-SYNTHETIC.pdf` regenerated: 1 page, A4. Page margins tightened slightly to fit the extra line; body text is still 10 pt.
- Files: `lib/brief/model.ts`, `lib/brief/BriefDocument.tsx`, `components/brief/BriefPreview.tsx`, `lib/rules/engine.ts`, `test/unit/brief.test.ts`.

## D. Rule template correctness: done
- New `{key:unit}` placeholder prints "24 months" or "not stated". ENDO-01 now reads "(duration: not stated)" when unknown; PCOS-01 "cycle length: not stated"; ENDO-05 uses the same placeholder. Clinical meaning and thresholds unchanged.
- `test/unit/templates.test.ts` fires every rule with its minimum facts and asserts no braces, "undefined", "null", "NaN" or blank values, and that every placeholder in the rule files is a form the engine can fill.
- Questions for the reviewer are listed in `PROGRESS.md`.
- Files: `lib/rules/engine.ts`, `rules/endometriosis.json`, `rules/pcos.json`, `test/unit/templates.test.ts`.

## E. Speech path: partial
- **Done in code:** default model chosen by device (`whisper-tiny` when `hardwareConcurrency <= 4` or `deviceMemory <= 4`, with "Better accuracy, slower" opt-in); honest expectation line on the capture screen; cancel returns to typing with a clear message; failures fall back to typing. Held-out narratives added (5) and accuracy reported separately for development and held-out sets; one real bug found by them (number-word boundaries) fixed.
- **Not done:** the real-browser run. **No timings, download size or transcript quality were measured.** The model default is a hardware rule, not a measurement. A voice e2e (`test/e2e/voice.spec.ts`, project `voice`) is written and skips itself until `test/audio/demo.wav` exists.
- Files: `lib/voice/transcribe.ts`, `components/story/StoryCapture.tsx`, `lib/extract/parsers.ts`, `test/narratives/heldout.json`, `test/unit/heldout.test.ts`, `test/unit/voicemodel.test.ts`, `test/e2e/voice.spec.ts`, `playwright.config.ts`, `test/audio/README.md`.

## F. Offline and service worker: partial
- **Done in code:** cache name `navira-shell-<build hash>` (stamped by `scripts/gen-sw.mjs`, verified in the built `sw.js`); non-blocking "Update ready, Reload" toast when a new worker takes over an already-controlled page; delete-all now waits for the service worker to restore the shell and, **when offline, keeps the app-shell cache** (it holds only public app files) while still erasing all user data. Unit-tested with stand-ins for caches, storage and the service worker.
- **Written, not run:** Playwright specs for offline navigation, offline PDF, delete-all then offline load, model cache, Network indicator. Second offline voice run is in the `voice` project.
- Files: `scripts/gen-sw.mjs`, `public/sw.js`, `lib/privacy/deleteAll.ts`, `components/Shell.tsx`, `test/unit/deleteall.test.ts`, `test/e2e/offline.spec.ts`.

## G. Tidy-ups: partly done
- **Done:** the empty "Relevant history: Not stated" section is hidden when the same gap is already under "Not yet known" (kept when there is something to show, or when the gap is not listed). Built `out/` grepped for forbidden phrases: none.
- **Not done:** appointment-prep checklist (skipped on purpose; see `PROGRESS.md`).
- Files: `lib/brief/model.ts`, `lib/brief/BriefDocument.tsx`, `components/brief/BriefPreview.tsx`, `test/unit/brief.test.ts`.
