import { z } from 'zod';
import { db } from '@/lib/db/dexie';
import { FactSchema } from '@/lib/extract/schema';

const StorySchema = z.object({
  id: z.string(), createdAt: z.string(), lang: z.enum(['en', 'hi', 'hinglish']), transcript: z.string(),
  facts: z.array(FactSchema), synthetic: z.boolean().optional(), askedKeys: z.array(z.string()), followupsDone: z.boolean(),
  confirmedAt: z.string().optional(), excerpt: z.string().optional(),
});
const BundleSchema = z.object({ app: z.literal('navira'), version: z.literal(1), exportedAt: z.string(), stories: z.array(StorySchema) });
export type Bundle = z.infer<typeof BundleSchema>;

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 200_000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(plain: string, pass: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pass, salt), new TextEncoder().encode(plain)));
  return JSON.stringify({ app: 'navira', enc: true, salt: b64(salt), iv: b64(iv), data: b64(data) });
}
export async function decryptText(file: string, pass: string): Promise<string> {
  const j = JSON.parse(file);
  const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(j.iv) as BufferSource }, await key(pass, unb64(j.salt)), unb64(j.data) as BufferSource);
  return new TextDecoder().decode(out);
}
export const isEncrypted = (file: string) => { try { return JSON.parse(file).enc === true; } catch { return false; } };

export async function buildExport(pass?: string): Promise<string> {
  const stories = await db().stories.toArray();
  const bundle: Bundle = { app: 'navira', version: 1, exportedAt: new Date().toISOString(), stories };
  const plain = JSON.stringify(bundle);
  return pass ? encryptText(plain, pass) : plain;
}

export function parseBundle(plain: string): Bundle { return BundleSchema.parse(JSON.parse(plain)); }

export async function importBundle(file: string, pass?: string): Promise<number> {
  const plain = isEncrypted(file) ? await decryptText(file, pass ?? '') : file;
  const b = parseBundle(plain);
  await db().stories.bulkPut(b.stories);
  return b.stories.length;
}
