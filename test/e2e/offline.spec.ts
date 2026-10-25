import { expect, test } from '@playwright/test';
import { runDemoToBrief } from './helpers';

/** After the first online load, the whole typed/demo flow must work in airplane mode. */
test('offline: capture, review, rules, timeline and brief all work', async ({ page, context }) => {
  await page.goto('/');
  for (const r of ['/start/', '/story/', '/review/', '/followups/', '/timeline/', '/brief/', '/privacy/', '/safety/']) await page.goto(r);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.goto('/');
  await page.waitForTimeout(1500); // let the precache finish

  await context.setOffline(true);
  const bad: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== 'http://localhost:3100' || r.method() !== 'GET' || r.postData()) bad.push(r.url()); });

  await page.reload();
  await runDemoToBrief(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  expect(bad).toEqual([]);
});

test('after delete-all the app still loads offline, and storage is really empty', async ({ page, context }) => {
  await page.goto('/');
  for (const r of ['/start/', '/story/', '/review/', '/timeline/', '/brief/', '/privacy/']) await page.goto(r);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await runDemoToBrief(page);

  await page.goto('/privacy/#delete');
  await page.getByRole('button', { name: 'Delete all data' }).first().click();
  await page.getByLabel(/Also remove the downloaded speech model/).check();
  await page.getByRole('button', { name: 'Yes, erase everything' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Erased' })).toBeVisible({ timeout: 30_000 }); // waits for the shell to be restored

  const left = await page.evaluate(async () => {
    const names = await caches.keys();
    const dbs = (await indexedDB.databases?.()) ?? [];
    let stories = -1;
    if (dbs.some((d) => d.name === 'navira')) {
      stories = await new Promise<number>((res) => {
        const req = indexedDB.open('navira');
        req.onsuccess = () => { const db = req.result; try { const c = db.transaction('stories').objectStore('stories').count(); c.onsuccess = () => res(c.result); } catch { res(0); } };
        req.onerror = () => res(0);
      });
    }
    return { local: Object.keys(localStorage).length, modelCache: names.filter((n) => /transformers/.test(n)).length, stories };
  });
  expect(left.local).toBe(0);
  expect(left.modelCache).toBe(0);
  expect(left.stories).toBeLessThanOrEqual(0);

  await context.setOffline(true);
  await page.goto('/');
  await expect(page.locator('h1#h1')).toBeVisible();
  await page.goto('/start/');
  await expect(page.getByRole('heading', { name: 'Before we begin' })).toBeVisible();
  await page.goto('/story/');
  await expect(page.getByLabel('Or type your story here')).toBeVisible();
});
