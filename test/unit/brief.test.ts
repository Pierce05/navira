import { describe, expect, it } from 'vitest';
import path from 'node:path';
// pdf-parse's index.js runs a debug routine when imported as an entry; import the lib file directly.
// @ts-expect-error no types
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { renderToBuffer } from '@react-pdf/renderer';
import { briefElement } from '@/lib/brief/BriefDocument';
import { registerBriefFonts } from '@/lib/brief/fonts';
import { buildBriefModel } from '@/lib/brief/model';
import { PACKS, evaluateRules, type RulePack } from '@/lib/rules/engine';
import { storyFrom, text } from './helpers';

registerBriefFonts(path.resolve(__dirname, '../../public/fonts'));

async function render(t: string, extra: Partial<Parameters<typeof buildBriefModel>[0]> = {}, synthetic = false) {
  const story = storyFrom(t, { synthetic });
  const model = buildBriefModel({ story, results: evaluateRules(story.facts), now: new Date('2026-10-24T00:00:00Z'), ...extra });
  const buf = await renderToBuffer(briefElement(model));
  const parsed = await pdfParse(buf);
  return { model, pages: parsed.numpages as number, text: parsed.text as string };
}

describe('brief PDF: draft markers and review notice', () => {
  const DRAFT = 'Rule wording is a draft pending clinician review.';
  const reviewed = PACKS.map((p) => ({ ...p, reviewStatus: 'reviewed', reviewedBy: 'Dr Example (test)' })) as RulePack[];

  it('the rule files keep "(verify)" for developers, but the brief never prints it, and shows the draft notice', async () => {
    expect(JSON.stringify(PACKS)).toContain('(verify)'); // still present in the data
    const r = await render(text(0), {}, true);
    expect(r.text).not.toMatch(/\(verify\)/i);
    expect(r.text).not.toMatch(/verify/i);
    expect(r.text.replace(/\s+/g, ' ')).toContain(DRAFT);
    expect(r.pages).toBe(1);
    expect(JSON.stringify(r.model)).not.toMatch(/verify/i);
  });

  it('the draft notice disappears only when every pack is reviewed AND names a reviewer', async () => {
    const ok = await render(text(0), { packs: reviewed });
    expect(ok.text.replace(/\s+/g, ' ')).not.toContain(DRAFT);
    expect(ok.model.draftNotice).toBeNull();
    expect(ok.pages).toBe(1);

    const noName = reviewed.map((p, i) => (i === 0 ? { ...p, reviewedBy: null } : p)) as RulePack[];
    expect((await render(text(0), { packs: noName })).model.draftNotice).toBe(DRAFT);
    const oneDraft = reviewed.map((p, i) => (i === 0 ? { ...p, reviewStatus: 'draft' } : p)) as RulePack[];
    expect((await render(text(0), { packs: oneDraft })).model.draftNotice).toBe(DRAFT);
  });
});

describe('brief PDF: no duplicate "not stated" history', () => {
  it('hides the empty history section when the same gap is already under Not yet known', async () => {
    const r = await render(text(0)); // demo: no family/prior-evaluation info, and both are listed as not yet known
    expect(r.model.showHistory).toBe(false);
    expect(r.text).not.toMatch(/Relevant history/);
    expect(r.text).toMatch(/Family history of similar problems/);
  });
  it('keeps the history section when there is something to show', async () => {
    const r = await render(text(1)); // N02 has family history + ultrasound + told normal
    expect(r.model.showHistory).toBe(true);
    expect(r.text).toMatch(/Relevant history/);
  });
  it('keeps the honest "Not stated" line when nothing in Not yet known covers it', async () => {
    const r = await render(text(9)); // sparse PCOS-pattern story: history gaps are not on its list
    expect(r.model.showHistory).toBe(true);
    expect(r.text).toMatch(/Relevant history/);
  });
});

describe('brief PDF', () => {
  it('demo data fits on exactly one A4 page', async () => {
    const r = await render(text(0), {}, true);
    expect(r.pages).toBe(1);
    expect(r.text).toMatch(/SYNTHETIC/);
    expect(r.text).toMatch(/Not a diagnosis/);
    expect(r.text).toMatch(/Not yet known/);
    expect(r.text).toMatch(/Patient-confirmed on 2026-10-24/);
  });

  it('degrades gracefully with sparse data (still one page, honest empty states)', async () => {
    const r = await render(text(9));
    expect(r.pages).toBe(1);
    expect(r.text).toMatch(/Not stated/);
  });

  it('degrades gracefully with no confirmed facts at all', async () => {
    const story = storyFrom('hello', { confirm: false });
    const model = buildBriefModel({ story, results: evaluateRules(story.facts) });
    const buf = await renderToBuffer(briefElement(model));
    expect((await pdfParse(buf)).numpages).toBe(1);
  });

  it('a rich endometriosis + PCOS story still fits one page', async () => {
    const rich = `${text(1)} ${text(2)} ${text(6)} ${text(7)} ${text(8)}`;
    const r = await render(rich, { safetyLabels: ['Sudden severe pain'], includeSafety: true, notes: 'Ask about referral options and about tracking.' });
    expect(r.pages).toBe(1);
  });

  it('renders Devanagari excerpts', async () => {
    const r = await render(text(4));
    expect(r.pages).toBe(1);
  });

  it('keeps patient-reported and system-generated sections distinctly labelled', async () => {
    const r = await render(text(0));
    expect(r.text).toMatch(/Reported by the patient/);
    expect(r.text).toMatch(/Generated by Navira from confirmed answers/);
  });

  it('only confirmed facts reach the brief', () => {
    const story = storyFrom(text(0), { confirm: false });
    const model = buildBriefModel({ story, results: evaluateRules(story.facts) });
    expect(model.symptoms).toEqual([]);
    expect(model.features).toEqual([]);
  });
});
