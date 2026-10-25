# PROGRESS

Plain status. "Verified" means it was actually run in the build sandbox. Anything not run is listed under **Not verified** and must not be quoted as tested.

## Verified on 2026-10-25 (build sandbox: Node, no browser, no access to model/browser download hosts)

| Check | Result |
|---|---|
| Dependencies | Installed earlier in this environment. Not re-installed from scratch in this pass. |
| `npm run typecheck` (`tsc --noEmit`) | **Pass**, 0 errors |
| `npm test` (Vitest) | **156 tests passed, 14 files, 0 failed** |
| `npm run build` | **Pass.** 10 static routes plus the landing at `/`. `out/index.html` is byte-identical to `public/index.html` (checked with `cmp`). Service worker stamped `navira-shell-<build hash>`, precaching 72 files. |
| Forbidden phrases in built output | `out/**/*.html` and the app's own chunks scanned: **no hits**. No `(verify)` string in any built HTML page. |
| `docs/demo-brief-SYNTHETIC.pdf` | Regenerated. **1 page, A4**, no "verify" text, draft-review line present. |
| `npx playwright install chromium` | **Failed** (download blocked in this sandbox), tried twice. |
| `npm run test:e2e` | **NOT RUN.** 35 specs are written and `playwright test --list` compiles them, but none has been executed. |
| Whisper / speech path | **NOT RUN.** No browser, no model download, no TTS to make a Hinglish clip. |
| `npm audit --omit=dev` | **10 advisories (8 high, 2 critical), not triaged.** Next 14.2.15 (server-side issues; this is a static export with no Next server at runtime, but should still be upgraded) and `protobufjs` via `onnx-proto` inside `@xenova/transformers` (parses model files; self-hosting the model removes the untrusted-host exposure). Upgrades are major-version jumps, so not done blind. |

## Extraction accuracy: two sets, reported separately (printed by `npm test`)

| Set | Result | Notes |
|---|---|---|
| **Development set** (10 narratives in `test/narratives/narratives.json`) | 110/110 | Written alongside the lexicon. **Optimistic. Do not quote it as accuracy.** |
| **Held-out set** (5 narratives in `test/narratives/heldout.json`) | **41/56 = 73.2%** | Written afterwards in messier language (Hinglish, Devanagari, English, mixed, fragmented) and **not tuned to**. Caveat: I wrote the lexicon in this same project, so these are not blind in the strict sense. A native speaker should write the next set. |

Held-out misses (left as findings, not patched, except one):
- **Missed symptoms/facts (fail-safe: they stay "unknown")**: pelvic pain not found in a messy Hinglish sentence ("period ke pehle aur uske dauran bahut dard rehta hai"); sex-pain in Devanagari when a word sits between ("सेक्स के समय भी दर्द"); "mummy ko bhi aisa hi tha" (family history); "aaram nahi milta" (no relief); "takes the edge off" (partial relief); "sleep ... ruined"; "eighteen months" (spelled-out numbers beyond the small list).
- **One wrong-direction value**: "helped a bit" is read as full relief, not partial. A person would see and can correct this chip, but it overstates.
- **One wrong value, fixed**: "eighteen months" was read as **3 months** because the number-word `teen` matched inside "eighteen". Number words now need word boundaries (`lib/extract/parsers.ts`, regression test added). That fix lowered the held-out score by one point (a wrong value became a missing one), which is the right trade.

## Fix-by-fix status: see `CHANGES.md`

## Safety notes
- Self-harm detection is no longer subject to the negation guard. A consequence is intended: "I am not suicidal, but I keep thinking about suicide" and similar hedged phrases show the support card. More false alarms, fewer misses.
- Urgent flags still use the negation guard ("no fainting with the pain" does not fire). Hinglish "na" was removed from the guard.
- **Follow-up questions are tap-only** (yes/no, choices, 0-10, numeric inputs), so there is no free text there to scan. Free text is scanned in: the story box, the review "Add note" box, brief questions and brief notes.
- Not yet reviewed by a clinician: the red-flag phrases, the "every hour" bleeding wording (it does not check for the "2 hours or more" duration in the PRD), and the self-harm phrase list.

## Not verified here (needs a real browser, a real phone, or a real person)
1. **All Playwright specs** (journey, landing, safety, privacy, offline, delete-all offline, mobile/a11y, voice).
2. **Whisper**: model download size and time, transcription time for 20 s of audio, transcript quality. Nothing is measured. The default model is chosen by a **hardware rule** (`hardwareConcurrency <= 4` or `deviceMemory <= 4` gives `whisper-tiny`), not by timing. "Better accuracy, slower" (`whisper-base`) remains opt-in on those devices.
3. **"Resumable" download**: transformers.js caches each completed model file, so cancelling and retrying continues at file granularity (not mid-file). Unproven in a browser.
4. **Service worker**: offline behaviour, the "Update ready" toast, and cache replacement after a redeploy. Delete-all's SW handshake is covered by a unit test with stand-ins, not a real service worker.
5. Landing and app **shared theme/language across pages**: covered by static unit checks on the landing's code and by e2e specs that have not been run.
6. Lighthouse (target 95+), screen-reader pass, black-and-white print preview, low-end Android performance.
7. Optional on-device LLM: untested and off by default.

## Not done
- **Appointment-prep checklist (G, optional):** skipped. The suite is green but I could not verify anything in a browser, so I did not add more untested UI.
- Mode B, "what changed since last time", Hindi brief, backup demo video.
- Real held-out evaluation with native speakers.

## Questions for the clinical reviewer (no clinical wording or threshold was changed)
1. **ENDO-01**: fires on pelvic pain with EITHER duration of 3 months or more, OR a recurring pattern with no duration. Is that intended? Wording now says "(duration: not stated)" when unknown.
2. **ENDO-02**: any missed activity counts as "functional impact". Should it need a minimum (for example days per month)?
3. **ENDO-04**: cycle relation is the patient's own report. Is that sufficient to word it as "around periods"?
4. **ENDO-05**: fixed at 12 months. Should the threshold differ by age, and is age needed?
5. **ENDO-06**: "first-line painkillers" includes any painkiller the person names. Acceptable?
6. **PCOS-01**: cycle limits (under 21 / over 35 days, under 8 a year) are for adults; adolescents differ and age is not collected.
7. **PCOS-02/03**: wording of "features sometimes considered under androgen-related evaluation" and the combined statement.
8. **Red flags**: bleeding wording does not check the 2-hour duration; pregnancy-plus-pain scope; fever wording; the self-harm phrase list (and whether hedged phrases should show the card, which is now the behaviour).
9. **Footer wording** "Rule wording is a draft pending clinician review." disappears only when every pack has `reviewStatus: "reviewed"` and a non-null `reviewedBy`. Who signs off?

## Claims in the UI or PDF that still need real-world verification
- **Landing statistics**: "~7 years" average time to an endometriosis diagnosis "across 22 studies" (University of York scoping review, 2024) and "up to 70%" of people with PCOS estimated undiagnosed (WHO estimate; Aust Fam Physician, 2012). Verify the figures, dates and wording against the sources before presenting.
- **Landing privacy lines**: "your story never does [download]" and "Your voice and story are processed and stored on this device." Verify in a real browser with the Network panel.
- **Landing**: "a brief your doctor can read in 30 seconds" (and "Readable in about 30 seconds"): needs a clinician-readability check.
- **Emergency numbers**: 112 and Tele-MANAS 14416 (flagged in `lib/rules/redflags.ts`). The UI asks people to check they are current in their area.
- **Guideline section numbers and versions** marked "(verify)" in `rules/*.json` (NICE NG73 section 1.1, ESHRE 2022, International PCOS Guideline 2023). They are hidden from the brief but still need checking.
- **Hindi translations** (app chrome, follow-up questions, landing): need a native-speaker review.
- **Model sizes** quoted on the capture screen (~40 MB tiny, ~80 MB base): approximate.
- Rule wording and thresholds: drafts pending clinician sign-off.

## Self-audit against the HARD CONSTRAINTS
1. **No diagnosis / score / percentage**: Pass by test. The scanner covers `app/`, `components/`, `lib/`, `rules/` and now `public/index.html` (for "you may have", "likely", "diagnosis of", "risk score(s)", "positive for", "N% chance"). The landing's "Give risk scores" was reworded to "Give scores or percentages". Built `out/` was grepped separately. The landing's population statistics carry sources and are not predictions about a person.
2. **Nothing enters the record unless confirmed**: Pass by test and integration test. A wrong parse can still reach a chip (see held-out findings), but it must be confirmed or edited by the person first.
3. **Red-flag check first, rule-based, offline, interrupting**: Pass in logic. Self-harm can no longer be suppressed. Not exercised in a real browser.
4. **Privacy claims match reality**: Partly verified. Code and build output audited; no third-party URLs are requested at runtime except the model host; the landing has no external scripts, styles, fonts or images (test). The worker's downloads are reported to the Network indicator. Unverified in a real browser. Static analysis can miss runtime behaviour.
5. **Works with no LLM**: Pass. The LLM stays off by default.
6. **No weight / BMI / appearance triggers**: Pass by test.
7. **Reported vs interpreted distinct**: Pass (provenance field, different badge shape and border style, separate PDF section labels).

## Run this before judging (human checklist)
- [ ] Phone, real device: open the site online once, switch on airplane mode, reload, run **Use demo story** to the PDF.
- [ ] Footer shows **Network: 0** through the whole run. On `/privacy`, the model download (if any) appears under "Speech model downloads", not under user content.
- [ ] One real Hinglish voice sample on the demo device: note first-run download time and transcription time, and read the transcript for mistakes. Drop the numbers here.
- [ ] Say or type the red-flag line `Achanak bahut tez pet dard hua aur main behosh ho gayi`: the interrupt appears. Then `Some days I want to die`: the support card shows 112 and 14416 and the "check these numbers" line.
- [ ] **Delete all data** (with and without "remove speech model"), then confirm the app still opens offline.
- [ ] Download the PDF. Print preview in **black and white**: one page, text readable, no colour-only meaning.
- [ ] Toggle **dark** on the landing, go to the app, confirm it matches; toggle in the app, return to the landing.
- [ ] Contrast spot check of both themes on real screens (token pairs are automated).
- [ ] Redeploy a trivial change and confirm the "Update ready" toast appears once and Reload picks up the new version.
- [ ] Run `npx playwright install chromium && npm run build && npm run test:e2e`, and, with a clip in `test/audio/demo.wav`, `npx playwright test --project=voice`. Paste the results here.
