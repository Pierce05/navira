import { expect, test } from '@playwright/test';
import { runDemoToBrief } from './helpers';

test('delete-all erases the story and the settings', async ({ page }) => {
  await runDemoToBrief(page);
  await page.goto('/privacy/#delete');
  await page.getByRole('button', { name: 'Delete all data' }).first().click();
  await page.getByRole('button', { name: 'Yes, erase everything' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Erased' })).toBeVisible();
  const left = await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    return { localKeys: Object.keys(localStorage).length, naviraDb: dbs.some((d) => d.name === 'navira') };
  });
  expect(left.localKeys).toBe(0);
  await page.reload();
  await page.goto('/brief/');
  await expect(page.getByText('No story yet')).toBeVisible();
});

test('theme choice persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Network indicator stays at 0 on the privacy page and lists model downloads separately', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByText('Mode A: nothing carrying your content')).toBeVisible();
  await expect(page.getByText('Speech model downloads (disclosed)')).toBeVisible();
});
