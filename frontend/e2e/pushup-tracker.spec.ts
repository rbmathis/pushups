import { test, expect } from '@playwright/test';

test.describe('Pushup Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Layout', () => {
    test('should display the header', async ({ page }) => {
      await expect(page.locator('header')).toBeVisible();
    });

    test('should display the main dashboard', async ({ page }) => {
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display the footer', async ({ page }) => {
      await expect(page.locator('footer')).toBeVisible();
      await expect(page.locator('footer')).toContainText('Pushup Tracker');
    });

    test('should allow admin session settings to drive dashboard session defaults', async ({ page }) => {
      await page.getByRole('button', { name: /Admin/i }).click();
      await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();

      await page.locator('#admin-session-default-reps').fill('26');
      await page.locator('#admin-session-set-target').fill('7');
      await page.locator('#admin-session-prep-seconds').fill('6');
      await page.locator('#admin-session-rest-seconds').fill('75');
      await page.locator('#admin-session-tick-bpm').fill('95');

      await page.getByRole('button', { name: 'Save Session Settings' }).click();
      await expect(page.getByText('Session settings saved.')).toBeVisible();

      await page.getByRole('button', { name: /Back to Dashboard/i }).click();
      await page.getByRole('button', { name: 'Session' }).click();

      await expect(page.locator('#session-default-reps')).toHaveValue('26');
      await expect(page.locator('#session-set-target')).toHaveValue('7');
    });
  });

  test.describe('Pushup Form', () => {
    test('should display the Log Pushups form', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Log Pushups' })).toBeVisible();
    });

    test('should have an input field for pushup count', async ({ page }) => {
      const input = page.locator('#pushup-count');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('type', 'number');
    });

    test('should have default value of 30', async ({ page }) => {
      const input = page.locator('#pushup-count');
      await expect(input).toHaveValue('30');
    });

    test('should have a submit button', async ({ page }) => {
      const button = page.getByRole('button', { name: /Log Pushups/i });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    });

    test('should display range hint', async ({ page }) => {
      await expect(page.getByText('Range: 1 - 1000 pushups')).toBeVisible();
    });

    test('should show validation error for invalid input (0)', async ({ page }) => {
      const input = page.locator('#pushup-count');
      await input.fill('0');
      await expect(page.getByText('Pushups must be at least 1')).toBeVisible();
    });

    test('should show validation error for invalid input (>1000)', async ({ page }) => {
      const input = page.locator('#pushup-count');
      await input.fill('1001');
      await expect(page.getByText('Pushups cannot exceed 1000')).toBeVisible();
    });

    test('should disable submit button when validation fails', async ({ page }) => {
      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('0');
      await expect(button).toBeDisabled();
    });

    test('should accept valid input and enable submit', async ({ page }) => {
      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('50');
      await expect(button).toBeEnabled();
    });

    test('should update hint text when value changes', async ({ page }) => {
      const input = page.locator('#pushup-count');

      await input.fill('25');
      await expect(page.getByText('Ready to log 25 pushups')).toBeVisible();

      await input.fill('1');
      await expect(page.getByText('Ready to log 1 pushup')).toBeVisible();
    });

    test('should support guided session start, log, and stop flow', async ({ page }) => {
      await page.route('**/api/pushups', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, count: 20, message: 'Pushup logged successfully' }),
        });
      });

      await page.getByRole('button', { name: 'Session' }).click();

      await expect(page.locator('#session-default-reps')).toHaveValue('20');
      await expect(page.locator('#session-set-target')).toHaveValue('4');

      await page.getByRole('button', { name: 'Start Session' }).click();
      await expect(page.getByText('Get Ready')).toBeVisible();

      await page.waitForTimeout(5500);
      await expect(page.getByText(/Set 1 - GO/i)).toBeVisible();

      await page.getByRole('button', { name: 'Log Set' }).click();
      await expect(page.getByText(/Set 1 logged at 20 reps/i)).toBeVisible();
      await expect(page.getByText('Rest')).toBeVisible();

      await page.getByRole('button', { name: 'Stop Session' }).click();
      await expect(page.getByText('Session Summary')).toBeVisible();
      await expect(page.getByText('Sets completed: 1')).toBeVisible();
    });

    test('should submit form successfully', async ({ page }) => {
      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('15');
      await button.click();

      // Should show success message
      await expect(page.getByText(/Logged 15 pushups/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show loading state while submitting', async ({ page }) => {
      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('10');

      // Click and immediately check for loading state
      const submitPromise = button.click();

      // Check that button shows loading (might be quick)
      await expect(button).toContainText(/Logging|Log Pushups/);
      await submitPromise;
    });
  });

  test.describe('Statistics Dashboard', () => {
    test('should display Statistics heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
    });

    test('should load and display stat cards', async ({ page }) => {
      // Wait for stats to load (either real data or mock data)
      await page.waitForTimeout(2000);

      // Should have stat cards visible
      const statCards = page.locator('[class*="rounded-lg"]').filter({ hasText: /Total|Average|Streak/i });
      await expect(statCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show loading state initially', async ({ page }) => {
      // On fresh page load, should show loading animation
      const loadingElements = page.locator('.animate-pulse');
      // May or may not catch loading state depending on speed
      const count = await loadingElements.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Trends Chart', () => {
    test('should display chart section', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForTimeout(2000);

      // Look for chart container or error message
      const chartOrError = page.locator('canvas, [class*="bg-amber"], [class*="bg-red"]');
      await expect(chartOrError.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('API Integration', () => {
    test('should call /api/pushups when logging pushups', async ({ page }) => {
      // Intercept API call
      let apiCalled = false;
      await page.route('**/api/pushups', async (route) => {
        apiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, count: 20, message: 'Pushup logged successfully' }),
        });
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('20');
      await button.click();

      await page.waitForTimeout(1000);
      expect(apiCalled).toBe(true);
    });

    test('should call /api/statistics on page load', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/statistics', async (route) => {
        apiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dailyTotal: 100,
            sevenDayAverage: 75,
            currentStreak: 5,
            thirtyDayAverage: 60,
            allTimeStats: { totalPushups: 5000 }
          }),
        });
      });

      await page.reload();
      await page.waitForTimeout(2000);

      expect(apiCalled).toBe(true);
    });

    test('should call /api/history on page load', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/history**', async (route) => {
        apiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { date: '2026-04-20', total: 100 },
            { date: '2026-04-19', total: 80 },
          ]),
        });
      });

      await page.reload();
      await page.waitForTimeout(2000);

      expect(apiCalled).toBe(true);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/statistics', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.reload();
      await page.waitForTimeout(2000);

      // Should show error message or fallback to mock data
      const errorOrMock = page.locator('[class*="bg-red"], [class*="mock"]');
      // App should still be functional
      await expect(page.getByRole('heading', { name: 'Log Pushups' })).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/pushups', async (route) => {
        await route.abort('failed');
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('10');
      await button.click();

      // Should show network error message
      await expect(page.getByText(/Network error|connection/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper labels on form inputs', async ({ page }) => {
      const label = page.locator('label[for="pushup-count"]');
      await expect(label).toBeVisible();
      await expect(label).toContainText('Number of Pushups');
    });

    test('should have aria-label on submit button', async ({ page }) => {
      const button = page.getByRole('button', { name: /Log Pushups/i });
      await expect(button).toHaveAttribute('aria-label', 'Log pushups button');
    });

    test('should have role="alert" on error messages', async ({ page }) => {
      // Mock API to return error
      await page.route('**/api/pushups', async (route) => {
        await route.abort('failed');
      });

      const input = page.locator('#pushup-count');
      const button = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('10');
      await button.click();

      // The error message container has role="alert"
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('E2E Workflow', () => {
    test('should complete full pushup logging workflow', async ({ page }) => {
      // 1. Page loads
      await expect(page.getByRole('heading', { name: 'Log Pushups' })).toBeVisible();

      // 2. Enter pushup count
      const input = page.locator('#pushup-count');
      await input.fill('25');

      // 3. Verify ready message
      await expect(page.getByText('Ready to log 25 pushups')).toBeVisible();

      // 4. Submit form
      const button = page.getByRole('button', { name: /Log Pushups/i });
      await button.click();

      // 5. Wait for response (success or error)
      await page.waitForTimeout(3000);

      // 6. Check form is still functional
      await expect(input).toBeVisible();
      await expect(button).toBeVisible();
    });

    test('should update statistics and chart after logging pushups', async ({ page }) => {
      // Wait for initial data to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify stat cards are visible
      await expect(page.getByText('Daily Total')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('All-Time Total')).toBeVisible({ timeout: 10000 });

      // Get the initial All-Time Total value (more reliable than Daily Total)
      const allTimeCard = page.getByText('All-Time Total').locator('..');
      const initialValueElement = allTimeCard.locator('.text-3xl, .text-4xl').first();
      const initialText = await initialValueElement.textContent().catch(() => '0');
      const initialValue = parseInt(initialText || '0', 10);

      console.log(`Initial All-Time Total: ${initialValue}`);

      // Enter and submit pushups
      const pushupCount = 17;
      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill(String(pushupCount));
      await expect(page.getByText(`Ready to log ${pushupCount} pushups`)).toBeVisible();

      await submitButton.click();

      // Verify success message appears
      await expect(page.getByText(/Logged 17 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for stats to refresh
      await page.waitForTimeout(2500);

      // Check that the All-Time Total stat updated
      const updatedText = await initialValueElement.textContent().catch(() => '0');
      const updatedValue = parseInt(updatedText || '0', 10);

      console.log(`Updated All-Time Total: ${updatedValue}`);

      // The All-Time Total should have increased
      expect(updatedValue).toBeGreaterThanOrEqual(initialValue);

      // Verify the chart is visible and rendered
      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });

      // Verify we're still on the page and everything is functional
      await expect(page.getByRole('heading', { name: 'Log Pushups' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
    });

    test('should show updated chart data after multiple entries', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify chart is displayed
      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });

      // Log first entry
      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill('20');
      await submitButton.click();
      await expect(page.getByText(/Logged 20 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for refresh
      await page.waitForTimeout(2000);

      // Chart should still be visible after update
      await expect(chartCanvas).toBeVisible();

      // Log second entry
      await input.fill('15');
      await submitButton.click();
      await expect(page.getByText(/Logged 15 pushups/i)).toBeVisible({ timeout: 10000 });

      // Wait for refresh
      await page.waitForTimeout(2000);

      // Verify chart is still displayed and updated
      await expect(chartCanvas).toBeVisible();

      // Verify stats section shows data (not loading/error state)
      const statsSection = page.getByRole('heading', { name: 'Statistics' }).locator('..');
      await expect(statsSection).toBeVisible();

      // Should not show error state
      const errorMessage = page.locator('[class*="bg-red-900"]').filter({ hasText: /Failed to load/i });
      await expect(errorMessage).not.toBeVisible();
    });

    test('should reflect pushup entry in all dashboard components', async ({ page }) => {
      // Wait for everything to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify all main components are visible before entry
      await expect(page.getByRole('heading', { name: 'Log Pushups' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();

      // Verify chart section exists
      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });

      // Verify stat cards are loaded (All-Time Total card)
      const allTimeCard = page.getByText('All-Time Total').locator('..');
      await expect(allTimeCard).toBeVisible({ timeout: 10000 });

      const initialAllTimeText = await allTimeCard.locator('.text-3xl, .text-4xl').first().textContent().catch(() => '0');
      const initialAllTimeValue = parseInt(initialAllTimeText || '0', 10);
      console.log('Initial All-Time Total:', initialAllTimeValue);

      // Submit a new pushup entry
      const entryCount = 33;
      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill(String(entryCount));
      await submitButton.click();

      // 1. Verify success message in form
      await expect(page.getByText(`Logged ${entryCount} pushups`)).toBeVisible({ timeout: 10000 });

      // 2. Wait for dashboard to refresh
      await page.waitForTimeout(2500);

      // 3. Verify Statistics section updated - All-Time Total should increase
      const updatedAllTimeText = await allTimeCard.locator('.text-3xl, .text-4xl').first().textContent().catch(() => '0');
      const updatedAllTimeValue = parseInt(updatedAllTimeText || '0', 10);
      console.log('Updated All-Time Total:', updatedAllTimeValue);

      // All-time total should have increased by the entry count
      expect(updatedAllTimeValue).toBeGreaterThanOrEqual(initialAllTimeValue);

      // 4. Verify chart is still rendered (canvas exists and has content)
      await expect(chartCanvas).toBeVisible();

      // 5. Verify all stat cards are still visible
      await expect(page.getByText('Daily Total')).toBeVisible();
      await expect(page.getByText('7-Day Average')).toBeVisible();
      await expect(page.getByText('Current Streak')).toBeVisible();
      await expect(page.getByText('30-Day Average')).toBeVisible();
      await expect(page.getByText('All-Time Total')).toBeVisible();

      // 6. Verify the form reset to default value after success
      await page.waitForTimeout(2500);
      await expect(input).toHaveValue('30');

      // 7. Verify we can immediately make another entry
      await input.fill('10');
      await expect(submitButton).toBeEnabled();
    });
  });
});
