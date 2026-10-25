import { expect, type Page } from '@playwright/test';

/** Demo story -> confirmed -> timeline -> brief. Returns once the brief page is showing. */
export async function runDemoToBrief(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Use demo story' }).click();
  await expect(page).toHaveURL(/\/story\/$/);
  await expect(page.getByLabel('Or type your story here')).toHaveValue(/periods ke time/);
  await page.getByRole('button', { name: 'Looks right' }).click();
  await expect(page).toHaveURL(/\/review\/$/);
  await page.getByRole('button', { name: 'Confirm all' }).click();
  // items marked "Please check" need a deliberate tap each
  while (await page.getByText('Please check', { exact: true }).count()) {
    await page.getByRole('button', { name: 'Yes, that is right' }).first().click();
  }
  await page.getByRole('link', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/followups\/$/);
  for (let i = 0; i < 5; i++) {
    const skip = page.getByRole('button', { name: 'Skip' });
    if (!(await skip.count())) break;
    await skip.click();
  }
  await page.getByRole('button', { name: 'See my timeline' }).click();
  await expect(page).toHaveURL(/\/timeline\/$/);
  await expect(page.getByText('Features commonly considered in evaluation').first()).toBeVisible();
  await page.getByRole('link', { name: 'Make my brief' }).click();
  await expect(page).toHaveURL(/\/brief\/$/);
}
