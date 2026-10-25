// Copies self-hosted fonts and ONNX wasm into /public (no CDN at runtime).
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
mkdirSync('public/fonts', { recursive: true });
mkdirSync('public/ort', { recursive: true });
const fonts = [
  ['@fontsource/fraunces/files', ['fraunces-latin-400-normal', 'fraunces-latin-600-normal']],
  ['@fontsource/dm-sans/files', ['dm-sans-latin-400-normal', 'dm-sans-latin-500-normal', 'dm-sans-latin-700-normal']],
  ['@fontsource/noto-sans-devanagari/files', ['noto-sans-devanagari-devanagari-400-normal', 'noto-sans-devanagari-devanagari-700-normal']],
];
for (const [dir, names] of fonts)
  for (const n of names) for (const ext of ['woff', 'woff2'])
    cpSync(`node_modules/${dir}/${n}.${ext}`, `public/fonts/${n}.${ext}`);
for (const f of readdirSync('node_modules/onnxruntime-web/dist'))
  if (f.startsWith('ort-wasm')) cpSync(`node_modules/onnxruntime-web/dist/${f}`, `public/ort/${f}`);
console.log('assets copied');
