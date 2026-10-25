// After `next build`: list every static file in /out and inject it into out/sw.js as the precache list.
// (Big ONNX wasm files are cached at runtime on first use instead, so the first load stays small.)
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const OUT = 'out';
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = path.join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else files.push('/' + path.relative(OUT, p).split(path.sep).join('/'));
  }
})(OUT);
const list = files.filter((f) => !/\.map$|^\/sw\.js$|^\/ort\/|\.woff$/.test(f)).map((f) => f.replace(/index\.html$/, ''));
// Build hash = content hash of every shipped file except sw.js. A redeploy with any change gets a new cache name,
// so the new service worker replaces the old shell instead of serving it forever.
const h = createHash('sha256');
for (const f of files.filter((f) => !/^\/sw\.js$/.test(f)).sort()) { h.update(f); h.update(readFileSync(path.join(OUT, f))); }
const hash = h.digest('hex').slice(0, 10);
const sw = readFileSync(path.join(OUT, 'sw.js'), 'utf8')
  .replace('self.__PRECACHE__ || []', JSON.stringify(['/', ...list]))
  .replace("'navira-shell-v1'", `'navira-shell-${hash}'`);
if (!sw.includes(`navira-shell-${hash}`)) throw new Error('cache name was not stamped');
writeFileSync(path.join(OUT, 'sw.js'), sw);
console.log(`sw.js: precaching ${list.length} files, cache navira-shell-${hash}`);
