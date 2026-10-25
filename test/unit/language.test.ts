import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** Forbidden-language scanner: no diagnosis, no probability, no score in anything a person can read. */
const FORBIDDEN = [/you may have/i, /\blikely\b/i, /diagnosis of/i, /risk score/i, /positive for/i, /\b\d{1,3}\s?% (chance|risk|probab)/i];
const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['app', 'components', 'lib', 'rules'];

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|json)$/.test(n)) out.push(p);
  }
  return out;
}

describe('forbidden-language scanner (built landing)', () => {
  it('public/index.html has none of the forbidden phrases', () => {
    const t = readFileSync(path.join(ROOT, 'public/index.html'), 'utf8').replace(/url\(data:[^)]*\)/g, '');
    for (const re of FORBIDDEN) expect(re.test(t), re.source).toBe(false);
  });
});

describe('forbidden-language scanner', () => {
  const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  it('scans a meaningful number of files', () => expect(files.length).toBeGreaterThan(15));
  for (const re of FORBIDDEN) {
    it(`no user-facing "${re.source}" anywhere in app/components/lib/rules`, () => {
      const bad = files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
      expect(bad).toEqual([]);
    });
  }
});
