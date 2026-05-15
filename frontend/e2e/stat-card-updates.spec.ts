/**
 * Stat Card Update Tests
 *
 * These tests verify that EACH stat card on the dashboard updates correctly
 * after a new pushup entry is logged via the form.
 */
import { test, expect, Page } from '@playwright/test';

// Run tests serially since they modify shared database state
test.describe.configure({ mode: 'serial' });

const API_BASE = 'http://localhost:3001/api';

/**
 * Helper to get displayed stat value from a card by its title
 */
async function getCardValue(page: Page, cardTitle: string): Promise<number> {
  // Find the card container that contains the title
  const card = page.locator('.bg-gray-800, .bg-slate-800, [class*="rounded"]')
    .filter({ hasText: cardTitle })
    .first();

  // Get the large number value (the stat value itself)
  const valueElement = card.locator('.text-3xl, .text-4xl, .text-2xl').first();
  const valueText = await valueElement.textContent();

  // Parse number, handle potential formatting
  const cleanValue = valueText?.replace(/[^0-9.-]/g, '') || '0';
  return parseInt(cleanValue, 10);
}

/**
 * Helper to log pushups via the UI form and wait for update
 */
async function logPushupsViaForm(page: Page, count: number): Promise<void> {
  const input = page.locator('#pushup-count');
  const submitButton = page.getByRole('button', { name: /Log Pushups/i });

  await input.fill(String(count));
  await submitButton.click();

  // Wait for success message
  await expect(page.getByText(/Logged.*pushup/i)).toBeVisible({ timeout: 10000 });

  // Wait for stats to refresh (Dashboard has 500ms delay + API call)
  await page.waitForTimeout(2000);
}

/**
 * Helper to get all stats from API
 */
async function getAPIStats(): Promise<{
  dailyTotal: number;
  sevenDayAverage: number;
  currentStreak: number;
  thirtyDayAverage: number;
  allTimeTotal: number;
}> {
  const response = await fetch(`${API_BASE}/statistics`);
  const data = await response.json();

  return {
    dailyTotal: data.dailyTotal?.total ?? data.dailyTotal ?? 0,
    sevenDayAverage: Math.round(data.sevenDayAverage?.average ?? data.sevenDayAverage ?? 0),
    currentStreak: data.currentStreak?.currentStreak ?? data.currentStreak ?? 0,
    thirtyDayAverage: Math.round(data.thirtyDayAverage?.average ?? data.thirtyDayAverage ?? 0),
    allTimeTotal: data.allTimeStats?.totalPushups ?? 0,
  };
}

test.describe('Stat Card Updates After Entry', () => {

  test.describe('Daily Total Card', () => {
    test('Daily Total should increase after logging pushups', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial Daily Total from UI
      const initialValue = await getCardValue(page, 'Daily Total');
      console.log(`Initial Daily Total: ${initialValue}`);

      // Log 25 pushups
      const pushupCount = 25;
      await logPushupsViaForm(page, pushupCount);

      // Get updated Daily Total
      const updatedValue = await getCardValue(page, 'Daily Total');
      console.log(`Updated Daily Total: ${updatedValue}`);

      // Verify it increased by exactly the pushup count
      expect(updatedValue).toBe(initialValue + pushupCount);
    });

    test('Daily Total should match API after update', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Log pushups
      await logPushupsViaForm(page, 15);

      // Get UI value
      const uiValue = await getCardValue(page, 'Daily Total');

      // Get API value
      const apiStats = await getAPIStats();

      // Compare
      console.log(`Daily Total - UI: ${uiValue}, API: ${apiStats.dailyTotal}`);
      expect(uiValue).toBe(apiStats.dailyTotal);
    });
  });

  test.describe('7-Day Average Card', () => {
    test('7-Day Average should update after logging pushups', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial value
      const initialValue = await getCardValue(page, '7-Day Average');
      console.log(`Initial 7-Day Average: ${initialValue}`);

      // Log pushups
      const pushupCount = 50;
      await logPushupsViaForm(page, pushupCount);

      // Get updated value
      const updatedValue = await getCardValue(page, '7-Day Average');
      console.log(`Updated 7-Day Average: ${updatedValue}`);

      // The average should change (increase or stay same if already high)
      // At minimum, verify it's a valid number
      expect(updatedValue).toBeGreaterThanOrEqual(0);

      // Verify it matches API
      const apiStats = await getAPIStats();
      expect(updatedValue).toBe(apiStats.sevenDayAverage);
    });

    test('7-Day Average should match API value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await logPushupsViaForm(page, 30);

      const uiValue = await getCardValue(page, '7-Day Average');
      const apiStats = await getAPIStats();

      console.log(`7-Day Average - UI: ${uiValue}, API: ${apiStats.sevenDayAverage}`);
      expect(uiValue).toBe(apiStats.sevenDayAverage);
    });
  });

  test.describe('Current Streak Card', () => {
    test('Current Streak should be at least 1 after logging today', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Log pushups (ensures we have activity today)
      await logPushupsViaForm(page, 10);

      // Get streak value
      const streakValue = await getCardValue(page, 'Current Streak');
      console.log(`Current Streak after logging: ${streakValue}`);

      // Should be at least 1 since we just logged pushups today
      expect(streakValue).toBeGreaterThanOrEqual(1);
    });

    test('Current Streak should match API value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await logPushupsViaForm(page, 20);

      const uiValue = await getCardValue(page, 'Current Streak');
      const apiStats = await getAPIStats();

      console.log(`Current Streak - UI: ${uiValue}, API: ${apiStats.currentStreak}`);
      expect(uiValue).toBe(apiStats.currentStreak);
    });
  });

  test.describe('30-Day Average Card', () => {
    test('30-Day Average should update after logging pushups', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const initialValue = await getCardValue(page, '30-Day Average');
      console.log(`Initial 30-Day Average: ${initialValue}`);

      await logPushupsViaForm(page, 40);

      const updatedValue = await getCardValue(page, '30-Day Average');
      console.log(`Updated 30-Day Average: ${updatedValue}`);

      // Verify it's a valid number and matches API
      expect(updatedValue).toBeGreaterThanOrEqual(0);

      const apiStats = await getAPIStats();
      expect(updatedValue).toBe(apiStats.thirtyDayAverage);
    });

    test('30-Day Average should match API value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await logPushupsViaForm(page, 35);

      const uiValue = await getCardValue(page, '30-Day Average');
      const apiStats = await getAPIStats();

      console.log(`30-Day Average - UI: ${uiValue}, API: ${apiStats.thirtyDayAverage}`);
      expect(uiValue).toBe(apiStats.thirtyDayAverage);
    });
  });

  test.describe('All-Time Total Card', () => {
    test('All-Time Total should increase by exact pushup count', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const initialValue = await getCardValue(page, 'All-Time Total');
      console.log(`Initial All-Time Total: ${initialValue}`);

      const pushupCount = 33;
      await logPushupsViaForm(page, pushupCount);

      const updatedValue = await getCardValue(page, 'All-Time Total');
      console.log(`Updated All-Time Total: ${updatedValue}`);

      // All-Time should increase by EXACTLY the pushup count
      expect(updatedValue).toBe(initialValue + pushupCount);
    });

    test('All-Time Total should match API value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await logPushupsViaForm(page, 27);

      const uiValue = await getCardValue(page, 'All-Time Total');
      const apiStats = await getAPIStats();

      console.log(`All-Time Total - UI: ${uiValue}, API: ${apiStats.allTimeTotal}`);
      expect(uiValue).toBe(apiStats.allTimeTotal);
    });
  });

  test.describe('All Cards Update Together', () => {
    test('all 5 stat cards should update after single entry', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Capture initial state of all cards
      const initial = {
        dailyTotal: await getCardValue(page, 'Daily Total'),
        sevenDayAvg: await getCardValue(page, '7-Day Average'),
        streak: await getCardValue(page, 'Current Streak'),
        thirtyDayAvg: await getCardValue(page, '30-Day Average'),
        allTimeTotal: await getCardValue(page, 'All-Time Total'),
      };

      console.log('Initial values:', initial);

      // Log pushups
      const pushupCount = 55;
      await logPushupsViaForm(page, pushupCount);

      // Capture updated state of all cards
      const updated = {
        dailyTotal: await getCardValue(page, 'Daily Total'),
        sevenDayAvg: await getCardValue(page, '7-Day Average'),
        streak: await getCardValue(page, 'Current Streak'),
        thirtyDayAvg: await getCardValue(page, '30-Day Average'),
        allTimeTotal: await getCardValue(page, 'All-Time Total'),
      };

      console.log('Updated values:', updated);

      // Get API values for comparison
      const apiStats = await getAPIStats();
      console.log('API values:', apiStats);

      // Verify Daily Total increased by pushup count
      expect(updated.dailyTotal).toBe(initial.dailyTotal + pushupCount);

      // Verify All-Time increased by pushup count
      expect(updated.allTimeTotal).toBe(initial.allTimeTotal + pushupCount);

      // Verify all UI values match API
      expect(updated.dailyTotal).toBe(apiStats.dailyTotal);
      expect(updated.sevenDayAvg).toBe(apiStats.sevenDayAverage);
      expect(updated.streak).toBe(apiStats.currentStreak);
      expect(updated.thirtyDayAvg).toBe(apiStats.thirtyDayAverage);
      expect(updated.allTimeTotal).toBe(apiStats.allTimeTotal);
    });

    test('multiple consecutive entries should accumulate correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial All-Time Total
      const initial = await getCardValue(page, 'All-Time Total');
      console.log(`Initial All-Time: ${initial}`);

      // Log first batch
      await logPushupsViaForm(page, 10);
      const afterFirst = await getCardValue(page, 'All-Time Total');
      console.log(`After first entry (10): ${afterFirst}`);
      expect(afterFirst).toBe(initial + 10);

      // Wait for form to reset
      await page.waitForTimeout(2500);

      // Log second batch
      await logPushupsViaForm(page, 20);
      const afterSecond = await getCardValue(page, 'All-Time Total');
      console.log(`After second entry (20): ${afterSecond}`);
      expect(afterSecond).toBe(initial + 30);

      // Wait for form to reset
      await page.waitForTimeout(2500);

      // Log third batch
      await logPushupsViaForm(page, 15);
      const afterThird = await getCardValue(page, 'All-Time Total');
      console.log(`After third entry (15): ${afterThird}`);
      expect(afterThird).toBe(initial + 45);

      // Final verification with API
      const apiStats = await getAPIStats();
      expect(afterThird).toBe(apiStats.allTimeTotal);
    });
  });

  test.describe('Real-time Update Verification', () => {
    test('stats should update without page refresh', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const initialAllTime = await getCardValue(page, 'All-Time Total');

      // Log pushups WITHOUT refreshing page
      const pushupCount = 17;
      await logPushupsViaForm(page, pushupCount);

      // Verify update WITHOUT page.reload()
      const updatedAllTime = await getCardValue(page, 'All-Time Total');

      expect(updatedAllTime).toBe(initialAllTime + pushupCount);
      console.log(`Updated from ${initialAllTime} to ${updatedAllTime} without refresh`);
    });

    test('UI should show "Updated!" feedback after refresh', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Log pushups
      await page.locator('#pushup-count').fill('12');
      await page.getByRole('button', { name: /Log Pushups/i }).click();

      // Wait for success
      await expect(page.getByText(/Logged.*pushup/i)).toBeVisible({ timeout: 10000 });

      // Look for "Updated!" feedback text
      await expect(page.getByText('Updated!')).toBeVisible({ timeout: 5000 });
    });
  });
});
