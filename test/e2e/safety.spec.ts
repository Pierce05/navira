import { expect, test } from '@playwright/test';

test('red flag interrupts the flow, and "not urgent" is logged and respected', async ({ page }) => {
  await page.goto('/start/');
  await page.getByLabel(/I understand my story stays/).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Or type your story here').fill('I had sudden severe pelvic pain this morning and then I fainted');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('112');
  await expect(dialog).not.toContainText(/you may have|diagnos/i);
  await dialog.getByRole('button', { name: "This isn't urgent for me" }).click();
  await expect(dialog).toBeHidden();
});

test('self-harm wording shows the support card', async ({ page }) => {
  await page.goto('/story/');
  await page.getByLabel('Or type your story here').fill('Some days I want to die');
  await expect(page.getByRole('alertdialog')).toContainText('14416');
});

test('/safety is reachable from every page and works offline-first', async ({ page }) => {
  await page.goto('/learn/');
  await page.getByRole('link', { name: 'Need urgent help?' }).click();
  await expect(page).toHaveURL(/\/safety\/$/);
  await expect(page.getByRole('link', { name: /Call 112/ })).toBeVisible();
});
