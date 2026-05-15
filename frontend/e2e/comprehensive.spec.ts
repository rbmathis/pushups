/**
 * Comprehensive E2E Tests
 * Testing edge cases, error handling, and complex workflows
 */
import { test, expect, Page } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

// Helper functions
async function logPushupsViaAPI(count: number): Promise<void> {
  await fetch(`${API_BASE}/pushups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, date: new Date().toISOString().split('T')[0] }),
  });
}

async function getStatsFromAPI(): Promise<any> {
  const response = await fetch(`${API_BASE}/statistics`);
  return response.json();
}

test.describe('Comprehensive E2E Tests', () => {
  test.describe('Form Validation Edge Cases', () => {
    test('should not submit with empty input', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      // Clear the input
      await input.fill('');

      // Check that the button state or hint text reflects empty input
      await expect(page.getByText('Enter a number to continue')).toBeVisible();
    });

    test('should show validation error for 0', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      await input.fill('0');

      await expect(page.getByText('Pushups must be at least 1')).toBeVisible();
    });

    test('should show validation error for negative numbers', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      await input.fill('-5');

      await expect(page.getByText('Pushups must be at least 1')).toBeVisible();
    });

    test('should show validation error for numbers > 1000', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      await input.fill('1001');

      await expect(page.getByText('Pushups cannot exceed 1000')).toBeVisible();
    });

    test('should accept exactly 1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('1');
      await expect(button).toBeEnabled();
      await expect(page.getByText('Ready to log 1 pushup')).toBeVisible();
    });

    test('should accept exactly 1000', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('1000');
      await expect(button).toBeEnabled();
      await expect(page.getByText('Ready to log 1000 pushups')).toBeVisible();
    });

    test('should handle rapid value changes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');

      // Rapidly change values
      await input.fill('10');
      await input.fill('50');
      await input.fill('100');
      await input.fill('25');

      await expect(page.getByText('Ready to log 25 pushups')).toBeVisible();
    });
  });

  test.describe('Network Error Handling', () => {
    test('should show error when API is unavailable', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Intercept and abort the pushups API call
      await page.route('**/api/pushups', route => route.abort('failed'));

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');
      await button.click();

      // Should show network error message
      await expect(page.getByText(/Network error|connection/i)).toBeVisible({ timeout: 10000 });
    });

    test('should handle server error (500)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.route('**/api/pushups', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');
      await button.click();

      // Should show server error message
      await expect(page.getByText(/Server error|try again/i)).toBeVisible({ timeout: 10000 });
    });

    test('should handle validation error (400)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.route('**/api/pushups', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid input', message: 'Count must be positive' }),
        });
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');
      await button.click();

      // Should show the error message from server
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('should recover after network error', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      let requestCount = 0;
      await page.route('**/api/pushups', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      // First attempt fails
      await input.fill('25');
      await button.click();
      await expect(page.getByText(/Network error|connection/i)).toBeVisible({ timeout: 10000 });

      // Wait for error to clear
      await page.waitForTimeout(6000);

      // Second attempt succeeds
      await input.fill('25');
      await button.click();
      await expect(page.getByText(/Logged 25 pushups/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state while submitting', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Delay the response to see loading state
      await page.route('**/api/pushups', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        route.continue();
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');

      // Click and check for loading state
      const clickPromise = button.click();

      // Should show loading indicator
      await expect(button).toContainText(/Logging/i);

      await clickPromise;
    });

    test('should disable input while submitting', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.route('**/api/pushups', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');
      button.click(); // Don't await

      // Input should be disabled during submission
      await expect(input).toBeDisabled();
    });
  });

  test.describe('Statistics Display', () => {
    test('should display all 5 stat cards', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await expect(page.getByText('Daily Total')).toBeVisible();
      await expect(page.getByText('7-Day Average')).toBeVisible();
      await expect(page.getByText('Current Streak')).toBeVisible();
      await expect(page.getByText('30-Day Average')).toBeVisible();
      await expect(page.getByText('All-Time Total')).toBeVisible();
    });

    test('should show units on stat cards', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await expect(page.getByText('pushups').first()).toBeVisible();
      await expect(page.getByText('pushups/day').first()).toBeVisible();
      await expect(page.getByText('days')).toBeVisible();
    });

    test('should handle statistics API error gracefully', async ({ page }) => {
      await page.route('**/api/statistics', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database error' }),
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should show error or mock data message
      const errorIndicator = page.locator('[class*="bg-red"]').filter({ hasText: /Failed|Error|mock/i });
      await expect(errorIndicator).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Chart Display', () => {
    test('should display the chart canvas', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });
    });

    test('should display chart title', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await expect(page.getByText(/30-Day Trend|Trend/i)).toBeVisible();
    });

    test('should handle history API error gracefully', async ({ page }) => {
      await page.route('**/api/history**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database error' }),
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should show error message or fallback
      const chartArea = page.locator('canvas').locator('..').locator('..');
      await expect(chartArea).toBeVisible();
    });
  });

  test.describe('Page Layout and Navigation', () => {
    test('should have correct page title', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Pushup Tracker')).toBeVisible();
    });

    test('should have responsive layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('main')).toBeVisible();

      // Check on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('main')).toBeVisible();

      // Check on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('main')).toBeVisible();
    });

    test('should have footer with copyright', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('footer')).toBeVisible();
      await expect(page.locator('footer')).toContainText('Pushup Tracker');
    });
  });

  test.describe('Success Flow', () => {
    test('should show success message after logging', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('50');
      await button.click();

      // Success message should appear
      await expect(page.getByText(/Logged 50 pushups/i)).toBeVisible({ timeout: 10000 });
    });

    test('should reset form after successful submission', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('75');
      await button.click();

      // Wait for success message
      await expect(page.getByText(/Logged 75 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for form reset (2 second delay in code)
      await page.waitForTimeout(3000);

      // Form should reset to default value
      await expect(input).toHaveValue('30');
    });

    test('should clear success message after timeout', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('50');
      await button.click();

      // Success message appears
      await expect(page.getByText(/Logged 50 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for message to clear
      await page.waitForTimeout(3000);

      // Success message should be gone
      await expect(page.getByText(/Logged 50 pushups/i)).not.toBeVisible();
    });
  });

  test.describe('Multiple Submissions', () => {
    test('should handle multiple rapid submissions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      // First submission
      await input.fill('10');
      await button.click();
      await expect(page.getByText(/Logged 10 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for form reset
      await page.waitForTimeout(2500);

      // Second submission
      await input.fill('20');
      await button.click();
      await expect(page.getByText(/Logged 20 pushups/i)).toBeVisible({ timeout: 10000 });
    });

    test('should prevent double submission', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      let submitCount = 0;
      await page.route('**/api/pushups', async route => {
        submitCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
        route.continue();
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('25');

      // Try to click multiple times rapidly
      await button.click();
      await button.click({ force: true }).catch(() => {}); // May be disabled

      // Should only submit once (button is disabled during loading)
      await page.waitForTimeout(1000);
      expect(submitCount).toBe(1);
    });
  });

  test.describe('Browser Refresh', () => {
    test('should maintain data after page refresh', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial stats
      const initialStats = await getStatsFromAPI();
      const initialTotal = initialStats.allTimeStats?.totalPushups ?? 0;

      // Log pushups via API
      await logPushupsViaAPI(100);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Stats should reflect the new entry
      const newStats = await getStatsFromAPI();
      expect(newStats.allTimeStats.totalPushups).toBe(initialTotal + 100);
    });
  });
});
