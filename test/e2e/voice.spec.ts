import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const AUDIO = path.resolve(__dirname, '../audio/demo.wav');
test.skip(!existsSync(AUDIO), 'test/audio/demo.wav not present: voice run skipped (see test/audio/README.md)');
test.use({ permissions: ['microphone'] });

async function speakOnce(page: import('@playwright/test').Page) {
  await page.goto('/story/');
  await page.getByLabel('Or type your story here').fill('');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(20_000); // length of the clip
  const t0 = Date.now();
  await page.getByRole('button', { name: /Recording, .* Press to stop/ }).click();
  await expect(page.getByLabel('Or type your story here')).not.toHaveValue('', { timeout: 240_000 });
  return { ms: Date.now() - t0, text: await page.getByLabel('Or type your story here').inputValue() };
}

test('voice: first run (downloads the model) then a second run fully offline', async ({ page, context }) => {
  test.setTimeout(600_000);
  let modelBytes = 0;
  let userContent = 0;
  page.on('response', async (r) => { if (/huggingface|hf\.co/.test(r.url())) modelBytes += Number((await r.headerValue('content-length')) ?? 0); });
  page.on('request', (r) => { const u = new URL(r.url()); if (/huggingface|hf\.co/.test(u.host)) return; if (u.origin !== 'http://localhost:3100' || r.method() !== 'GET' || r.postData()) userContent++; });

  const first = await speakOnce(page);
  expect(first.text.length).toBeGreaterThan(10);

  await context.setOffline(true);
  const second = await speakOnce(page); // model must now come from the browser cache
  expect(second.text.length).toBeGreaterThan(10);
  expect(userContent).toBe(0);

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/voice-timing.json', JSON.stringify({ clipSeconds: 20, firstRunMs: first.ms, offlineSecondRunMs: second.ms, modelBytesReported: modelBytes, firstTranscript: first.text, secondTranscript: second.text }, null, 2));
});
