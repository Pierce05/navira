// npx tsx scripts/demo-pdf.ts  -> writes demo-brief.pdf (SYNTHETIC) for eyeballing and for the backup video
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { renderToBuffer } from '@react-pdf/renderer';
import { briefElement } from '../lib/brief/BriefDocument';
import { registerBriefFonts } from '../lib/brief/fonts';
import { buildBriefModel } from '../lib/brief/model';
import { evaluateRules } from '../lib/rules/engine';
import { extractFacts } from '../lib/extract/lexicon';
import { DEMO_TRANSCRIPT } from '../lib/demo';

registerBriefFonts(path.resolve(__dirname, '../public/fonts'));
const facts = extractFacts(DEMO_TRANSCRIPT).map((f) => ({ ...f, status: 'confirmed' as const, needsCheck: false }));
const story = { id: 'demo', createdAt: new Date().toISOString(), lang: 'hinglish' as const, transcript: DEMO_TRANSCRIPT, facts, askedKeys: [], followupsDone: true, synthetic: true, confirmedAt: new Date().toISOString(), excerpt: DEMO_TRANSCRIPT.split('.').slice(0, 2).join('.').trim() + '.' };
const model = buildBriefModel({ story, results: evaluateRules(facts) });
renderToBuffer(briefElement(model)).then((b) => { writeFileSync('demo-brief.pdf', b); console.log('demo-brief.pdf', b.length, 'bytes'); });
