import { expect, test } from '@playwright/test';
import { runDemoToBrief } from './helpers';

test('demo story to a downloaded one-page PDF, with zero user-content network requests', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== 'http://localhost:3100' || r.method() !== 'GET' || r.postData()) outbound.push(`${r.method()} ${r.url()}`); });

  const t0 = Date.now();
  await runDemoToBrief(page);
  await expect(page.getByText('SYNTHETIC DEMO DATA').first()).toBeVisible();
  await expect(page.getByText('Not yet known').first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^navira-brief-\d{4}-\d{2}-\d{2}\.pdf$/);
  await expect(page.getByRole('status').filter({ hasText: 'single page' })).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(180_000); // under 3 minutes without help

  expect(outbound).toEqual([]);
  await expect(page.getByRole('link', { name: /Network: 0/ })).toBeVisible();
});

test('rules fire as drafted for the demo and nothing reads like a diagnosis', async ({ page }) => {
  await runDemoToBrief(page);
  const body = await page.locator('#brief-print').innerText();
  for (const id of ['ENDO-01', 'ENDO-02', 'ENDO-03', 'ENDO-04']) expect(body).toContain(id);
  for (const bad of [/you may have/i, /\blikely\b/i, /diagnosis of/i, /risk score/i, /positive for/i]) expect(body).not.toMatch(bad);
});
