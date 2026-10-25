import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
const block = (start: string) => {
  const i = css.indexOf(start);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
};
const light = block(':root {');
const dark = block(":root[data-theme='dark']");

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum]: 4.5 for text, 3 for UI boundaries
const PAIRS: [string, string, number][] = [
  ['ink', 'bg', 4.5], ['ink', 'surface', 4.5], ['ink', 'surface-2', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'surface', 4.5],
  ['accent-strong', 'bg', 4.5], ['accent-strong', 'surface', 4.5],
  ['on-accent', 'accent-strong', 4.5],
  ['danger', 'bg', 4.5], ['danger', 'surface', 4.5],
  ['line', 'bg', 3], ['line', 'surface', 3],
];

describe('theme contrast (WCAG 2.2 AA)', () => {
  for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: all tokens present`, () => { for (const [f, b] of PAIRS) { expect(theme[f], f).toBeTruthy(); expect(theme[b], b).toBeTruthy(); } });
    for (const [f, b, min] of PAIRS) {
      it(`${name}: ${f} on ${b} >= ${min}`, () => expect(ratio(theme[f], theme[b]), `${theme[f]} on ${theme[b]}`).toBeGreaterThanOrEqual(min));
    }
  }
  it('uses the exact palette hexes from the design reference', () => {
    expect(light.bg).toBe('#FFF7E6'); expect(light.blush).toBe('#F7C8D3'); expect(light.accent).toBe('#B46A72');
    expect(light.sage).toBe('#A8B58A'); expect(light.sky).toBe('#A9B7C6'); expect(light.ink).toBe('#2D3A47');
    expect(dark.bg).toBe('#16131F'); expect(dark.ink).toBe('#F0D9E4'); expect(dark.accent).toBe('#C1A0AC');
    expect(dark['surface-2']).toBe('#4A3F4B'); expect(dark.line).toBe('#806C79');
  });
});
