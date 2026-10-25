import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const raw = readFileSync(path.resolve(__dirname, '../../public/index.html'), 'utf8');
// the landing embeds fonts as base64: drop them before scanning text
const text = raw.replace(/url\(data:[^)]*\)/g, 'url(DATA)');

describe('landing page (public/index.html)', () => {
  it('shares theme and language storage keys with the app', () => {
    expect(text).toContain("'navira.theme'");
    expect(text).toContain("'navira.uiLang'");
    expect(text).not.toContain('nv-theme');
  });
  it('does not overwrite a "system" theme choice just by loading', () => {
    expect(text).toMatch(/function setT\(t,save\)/);
    // only an explicit light/dark choice is applied on load; "system" or nothing falls through to the OS preference
    expect(text).toMatch(/if\(st==='light'\|\|st==='dark'\)setT\(st,false\)/);
    // saving happens only when the person clicks the toggle
    expect(text).toMatch(/setT\(eff\(\)==='dark'\?'light':'dark',true\)/);
  });
  it('sends every CTA to /start/ and links the demo story', () => {
    const hrefs = [...text.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.filter((h) => h.startsWith('/start'))).toEqual(['/start/', '/start/', '/start/']);
    expect(hrefs).toContain('/story/?demo=1');
    expect(text).toContain("var START='/start/'");
  });
  it('registers the shared service worker so / works offline after a first visit', () => {
    expect(text).toContain("serviceWorker.register('/sw.js')");
  });
  it('describes the downloaded model accurately (speech model, not a language model)', () => {
    expect(text).toContain('The speech model downloads once');
    expect(text).not.toMatch(/The language model downloads/);
  });
  it('is self-contained: no third-party scripts, stylesheets, fonts or images', () => {
    expect(text).not.toMatch(/<script[^>]+src=/i);
    expect(text).not.toMatch(/<link[^>]+href=["']https?:/i);
    expect(text).not.toMatch(/@import|fonts\.googleapis|fonts\.gstatic|cdn\./i);
    expect(text).not.toMatch(/<img[^>]+src=["']https?:/i);
    expect(text).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|analytics|gtag/i);
  });
  it('contains no forbidden diagnosis/score language', () => {
    for (const re of [/you may have/i, /\blikely\b/i, /diagnosis of/i, /risk scores?/i, /positive for/i]) expect(text).not.toMatch(re);
  });
});
