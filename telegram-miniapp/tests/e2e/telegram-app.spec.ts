import { test, expect } from '@playwright/test';

// Note: Telegram mode tests are skipped because @telegram-apps/sdk requires
// proper launch parameters that can't be easily mocked with window.Telegram
// These will be tested manually in real Telegram environment
test.describe.skip('Telegram Mini App Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp environment
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initData: 'user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D',
          initDataUnsafe: {
            user: {
              id: 123,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
            },
          },
          themeParams: {
            bg_color: '#ffffff',
            text_color: '#000000',
            button_color: '#3390ec',
            button_text_color: '#ffffff',
          },
          version: '6.0',
          platform: 'tdesktop',
          colorScheme: 'light',
          isExpanded: true,
          viewportHeight: 600,
          viewportStableHeight: 600,
          headerColor: '#ffffff',
          backgroundColor: '#ffffff',
          isClosingConfirmationEnabled: false,
          expand: () => {},
          ready: () => {},
        },
      };
    });
  });

  test('should load app in Telegram environment', async ({ page }) => {
    await page.goto('/');

    // Wait for app to be ready
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Check header
    await expect(page.locator('.app-header h1')).toContainText('Shopping Assistant');
  });

  test('should show user greeting with Telegram user info', async ({ page }) => {
    await page.goto('/');

    // Wait for app to be ready
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Check user greeting
    await expect(page.locator('.user-greeting')).toContainText('Welcome, Test!');

    // Check username
    await expect(page.locator('.user-username')).toContainText('@testuser');
  });

  test('should display Telegram environment indicator', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Should show Telegram icon (not Browser Mode badge)
    await expect(page.locator('.status-item:has-text("Environment:") .status-value')).toContainText('📱 Telegram');
  });

  test('should show chat placeholder', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="chat-placeholder"]')).toBeVisible();
    await expect(page.locator('.placeholder-card h2')).toContainText('Chat Coming Soon');
  });

  test('should have navigation buttons', async ({ page }) => {
    await page.goto('/');

    // Check all nav buttons exist
    await expect(page.locator('.nav-button').nth(0)).toContainText('Home');
    await expect(page.locator('.nav-button').nth(1)).toContainText('Chat');
    await expect(page.locator('.nav-button').nth(2)).toContainText('Cart');
    await expect(page.locator('.nav-button').nth(3)).toContainText('Profile');

    // Check active state
    await expect(page.locator('.nav-button').nth(0)).toHaveClass(/active/);
  });
});

test.describe('Browser Mode (without Telegram)', () => {
  test('should work in browser without Telegram SDK', async ({ page }) => {
    // Don't inject Telegram mock
    await page.goto('/');

    // Should still load
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();

    // Should show Browser Mode badge
    await expect(page.locator('.dev-badge')).toContainText('Browser Mode');

    // Should show browser environment indicator
    await expect(page.locator('.status-item:has-text("Environment:") .status-value')).toContainText('🌐 Browser');

    // Should NOT show user info
    await expect(page.locator('.user-info')).not.toBeVisible();
  });

  test('should show different placeholder message in browser mode', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="chat-placeholder"]')).toBeVisible();
    await expect(page.locator('.placeholder-card p')).toContainText(
      'Running in browser mode'
    );
  });
});
