import { describe, expect, it } from 'vitest';
import { decryptText, encryptText, isEncrypted, parseBundle } from '@/lib/privacy/exportImport';
import { storyFrom, text } from './helpers';

describe('export / import', () => {
  it('encrypts and decrypts round trip, and a wrong passphrase fails', async () => {
    const enc = await encryptText('hello story', 'correct horse');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('hello story');
    expect(await decryptText(enc, 'correct horse')).toBe('hello story');
    await expect(decryptText(enc, 'wrong')).rejects.toBeTruthy();
  });
  it('validates bundles with Zod and rejects junk', () => {
    const ok = JSON.stringify({ app: 'navira', version: 1, exportedAt: 'x', stories: [storyFrom(text(0))] });
    expect(parseBundle(ok).stories).toHaveLength(1);
    expect(() => parseBundle('{"app":"other"}')).toThrow();
  });
});
