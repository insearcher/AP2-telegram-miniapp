import { test, expect } from '@playwright/test';

test.describe('Setup validation', () => {
  test('can load the application', async ({ page }) => {
    await page.goto('/');

    // Check that React has loaded
    await expect(page.locator('#root')).toBeVisible();
  });

  test('shows iteration 0 complete message', async ({ page }) => {
    await page.goto('/');

    // Check for our test message
    await expect(page.locator('text=AP2 Shopping Assistant')).toBeVisible();
    await expect(page.locator('text=Iteration 0')).toBeVisible();
  });
});
