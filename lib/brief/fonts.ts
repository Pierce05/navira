/** Self-hosted fonts for the PDF. In the browser they come from /fonts (same origin); in Node tests from node_modules. */
import { Font } from '@react-pdf/renderer';

let done = false;
export function registerBriefFonts(base: string) {
  if (done) return;
  const f = (n: string) => `${base}/${n}.woff`;
  Font.register({ family: 'DM Sans', fonts: [
    { src: f('dm-sans-latin-400-normal'), fontWeight: 400 },
    { src: f('dm-sans-latin-500-normal'), fontWeight: 500 },
    { src: f('dm-sans-latin-700-normal'), fontWeight: 700 },
  ] });
  Font.register({ family: 'Fraunces', fonts: [{ src: f('fraunces-latin-600-normal'), fontWeight: 600 }] });
  Font.register({ family: 'Noto Sans Devanagari', fonts: [
    { src: f('noto-sans-devanagari-devanagari-400-normal'), fontWeight: 400 },
    { src: f('noto-sans-devanagari-devanagari-700-normal'), fontWeight: 700 },
  ] });
  Font.registerHyphenationCallback((w) => [w]);
  done = true;
}
