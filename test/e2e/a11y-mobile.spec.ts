import { expect, test } from '@playwright/test';

test('touch targets are at least 44px and nothing scrolls sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of ['/', '/start/', '/story/', '/privacy/', '/learn/', '/safety/']) {
    await page.goto(r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${r} scrolls sideways`).toBe(false);
    const small = await page.$$eval('header a, footer a, nav a, button, select, input:not([type=checkbox]):not([type=radio]):not(.sr-only)', (els) =>
      els.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 43.5 && !(e as HTMLElement).closest('.sr-only'); }).map((e) => (e as HTMLElement).outerHTML.slice(0, 80)));
    expect(small, `${r} has small targets`).toEqual([]);
  }
});

test('mic denied falls back to typing with a helpful message', async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
  await page.goto('/story/');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByRole('alert')).toContainText('microphone is blocked');
  await expect(page.getByLabel('Or type your story here')).toBeFocused();
});
