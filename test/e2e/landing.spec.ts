import { expect, test } from '@playwright/test';

test('landing loads at / and "Tell your story" reaches /start/', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1#h1')).toContainText('Your body');
  await page.locator('#skipBtn').click({ trial: false }).catch(() => undefined); // splash is skippable
  await page.getByRole('link', { name: /Tell your story/ }).first().click();
  await expect(page).toHaveURL(/\/start\/$/);
});

test('theme chosen on the landing persists into the app, and back', async ({ page }) => {
  await page.goto('/');
  await page.locator('#skipBtn').click().catch(() => undefined);
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme').click();
  const chosen = before === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
  expect(await page.evaluate(() => localStorage.getItem('navira.theme'))).toBe(chosen);
  await page.goto('/start/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
  // choose the other theme in the app, return to the landing
  await page.getByLabel('Theme').selectOption(before === 'dark' ? 'dark' : 'light');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', before === 'dark' ? 'dark' : 'light');
});

test('language chosen on the landing persists into the app', async ({ page }) => {
  await page.goto('/');
  await page.locator('#skipBtn').click().catch(() => undefined);
  await page.locator('#lang').click();
  expect(await page.evaluate(() => localStorage.getItem('navira.uiLang'))).toBe('hi');
  await page.goto('/start/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});

test('demo link loads the synthetic story and cleans the URL', async ({ page }) => {
  await page.goto('/story/?demo=1');
  await expect(page.getByLabel('Or type your story here')).toHaveValue(/periods ke time/);
  await expect(page.getByText('SYNTHETIC').first()).toBeVisible();
  await expect(page).toHaveURL(/\/story\/$/);
});

test('landing and /start/ work offline after a first load', async ({ page, context }) => {
  await page.goto('/');
  await page.goto('/start/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1#h1')).toBeVisible();
  await page.goto('/start/');
  await expect(page.getByRole('heading', { name: 'Before we begin' })).toBeVisible();
});
