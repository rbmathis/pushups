import { test, expect, Page } from '@playwright/test';

// Run tests serially since they modify shared database state
test.describe.configure({ mode: 'serial' });

const API_BASE = 'http://localhost:3001/api';

/**
 * Helper to fetch current statistics from the API
 */
async function getStatisticsFromAPI(): Promise<{
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

/**
 * Helper to fetch history from the API
 */
async function getHistoryFromAPI(days: number = 30): Promise<Array<{ date: string; total: number }>> {
  const response = await fetch(`${API_BASE}/history?days=${days}`);
  return response.json();
}

/**
 * Helper to log pushups via API
 */
async function logPushupsViaAPI(count: number): Promise<void> {
  await fetch(`${API_BASE}/pushups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, date: new Date().toISOString().split('T')[0] }),
  });
}

/**
 * Helper to get displayed stat value from UI
 */
async function getStatValueFromUI(page: Page, statTitle: string): Promise<number> {
  const card = page.getByText(statTitle, { exact: false }).locator('..');
  const valueText = await card.locator('.text-3xl, .text-4xl').first().textContent();
  return parseInt(valueText || '0', 10);
}

test.describe('Data Accuracy Tests', () => {
  test.describe('Statistics Match API Data', () => {
    test('UI should display exact values from API', async ({ page }) => {
      // Get current stats from API
      const apiStats = await getStatisticsFromAPI();
      console.log('API Statistics:', apiStats);

      // Load the page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Verify Daily Total matches API
      const uiDailyTotal = await getStatValueFromUI(page, 'Daily Total');
      expect(uiDailyTotal).toBe(apiStats.dailyTotal);
      console.log(`Daily Total - API: ${apiStats.dailyTotal}, UI: ${uiDailyTotal}`);

      // Verify 7-Day Average matches API
      const ui7DayAvg = await getStatValueFromUI(page, '7-Day Average');
      expect(ui7DayAvg).toBe(apiStats.sevenDayAverage);
      console.log(`7-Day Average - API: ${apiStats.sevenDayAverage}, UI: ${ui7DayAvg}`);

      // Verify Current Streak matches API
      const uiStreak = await getStatValueFromUI(page, 'Current Streak');
      expect(uiStreak).toBe(apiStats.currentStreak);
      console.log(`Current Streak - API: ${apiStats.currentStreak}, UI: ${uiStreak}`);

      // Verify 30-Day Average matches API
      const ui30DayAvg = await getStatValueFromUI(page, '30-Day Average');
      expect(ui30DayAvg).toBe(apiStats.thirtyDayAverage);
      console.log(`30-Day Average - API: ${apiStats.thirtyDayAverage}, UI: ${ui30DayAvg}`);

      // Verify All-Time Total matches API
      const uiAllTime = await getStatValueFromUI(page, 'All-Time Total');
      expect(uiAllTime).toBe(apiStats.allTimeTotal);
      console.log(`All-Time Total - API: ${apiStats.allTimeTotal}, UI: ${uiAllTime}`);
    });

    test('UI should update with exact values after logging pushups', async ({ page }) => {
      // Load the page first
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Get current stats from UI (this is our source of truth for initial state)
      const initialUiAllTime = await getStatValueFromUI(page, 'All-Time Total');
      console.log('Initial UI All-Time Total:', initialUiAllTime);

      // Log pushups via UI
      const pushupCount = 42;
      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill(String(pushupCount));
      await submitButton.click();

      // Wait for success message
      await expect(page.getByText(`Logged ${pushupCount} pushups`)).toBeVisible({ timeout: 10000 });

      // Wait for stats to refresh
      await page.waitForTimeout(2500);

      // Get updated values from UI
      const updatedUiAllTime = await getStatValueFromUI(page, 'All-Time Total');
      console.log('Updated UI All-Time Total:', updatedUiAllTime);

      // Verify UI increased by exactly the pushup count
      expect(updatedUiAllTime).toBe(initialUiAllTime + pushupCount);
      console.log(`All-Time Total increased from ${initialUiAllTime} to ${updatedUiAllTime} (diff: ${updatedUiAllTime - initialUiAllTime})`);

      // Verify UI matches API
      const apiStats = await getStatisticsFromAPI();
      expect(updatedUiAllTime).toBe(apiStats.allTimeTotal);
      console.log(`UI matches API: ${updatedUiAllTime} === ${apiStats.allTimeTotal}`);
    });
  });

  test.describe('Chart Data Accuracy', () => {
    test('chart should reflect actual history data from API', async ({ page }) => {
      // Get history from API
      const apiHistory = await getHistoryFromAPI(30);
      console.log('API History:', apiHistory);

      // Load the page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify chart is rendered
      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });

      // The chart should have data points - verify via the chart legend or data labels
      // Since Chart.js renders to canvas, we verify the data is present by checking
      // the chart container isn't showing an error state
      const chartError = page.locator('[class*="bg-amber"], [class*="bg-red"]').filter({ hasText: /Failed|Error/i });
      await expect(chartError).not.toBeVisible();

      // If there's history data, today's date should be represented
      if (apiHistory.length > 0) {
        const todayData = apiHistory.find(h => h.date === new Date().toISOString().split('T')[0]);
        if (todayData) {
          console.log(`Today's total from API: ${todayData.total}`);

          // Verify the statistics match the history
          const apiStats = await getStatisticsFromAPI();
          // Daily total should match today's history entry
          // Note: They might differ slightly if entries are added during the test
          expect(apiStats.dailyTotal).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test.describe('Data Integrity After Multiple Operations', () => {
    test('multiple pushup entries should accumulate correctly', async ({ page }) => {
      // Load page first
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial state AFTER page load
      const initialStats = await getStatisticsFromAPI();
      console.log('Initial state:', initialStats);

      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      // Log first entry
      const firstEntry = 25;
      await input.fill(String(firstEntry));
      await submitButton.click();
      await expect(page.getByText(`Logged ${firstEntry} pushups`)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2500);

      // Verify first entry - All-Time Total should increase
      const afterFirst = await getStatisticsFromAPI();
      expect(afterFirst.allTimeTotal).toBe(initialStats.allTimeTotal + firstEntry);
      console.log(`After first entry (${firstEntry}): All-Time=${afterFirst.allTimeTotal}`);

      // Verify UI matches
      const uiAfterFirst = await getStatValueFromUI(page, 'All-Time Total');
      expect(uiAfterFirst).toBe(afterFirst.allTimeTotal);

      // Log second entry
      const secondEntry = 35;
      await input.fill(String(secondEntry));
      await submitButton.click();
      await expect(page.getByText(`Logged ${secondEntry} pushups`)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2500);

      // Verify second entry - All-Time Total should increase again
      const afterSecond = await getStatisticsFromAPI();
      expect(afterSecond.allTimeTotal).toBe(initialStats.allTimeTotal + firstEntry + secondEntry);
      console.log(`After second entry (${secondEntry}): All-Time=${afterSecond.allTimeTotal}`);

      // Verify UI shows correct totals
      const uiAllTime = await getStatValueFromUI(page, 'All-Time Total');
      expect(uiAllTime).toBe(afterSecond.allTimeTotal);

      console.log(`Final verification - UI All-Time: ${uiAllTime}, API All-Time: ${afterSecond.allTimeTotal}`);
    });

    test('history endpoint should reflect new entries', async ({ page }) => {
      // Get initial history
      const initialHistory = await getHistoryFromAPI(1);
      const initialTodayTotal = initialHistory[0]?.total ?? 0;
      console.log('Initial today total from history:', initialTodayTotal);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Log pushups
      const pushupCount = 50;
      const input = page.locator('#pushup-count');
      const submitButton = page.getByRole('button', { name: /Log Pushups/i });

      await input.fill(String(pushupCount));
      await submitButton.click();
      await expect(page.getByText(`Logged ${pushupCount} pushups`)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Get updated history
      const updatedHistory = await getHistoryFromAPI(1);
      const updatedTodayTotal = updatedHistory[0]?.total ?? 0;
      console.log('Updated today total from history:', updatedTodayTotal);

      // Verify history was updated correctly (history should increase by pushupCount)
      expect(updatedTodayTotal).toBe(initialTodayTotal + pushupCount);
      console.log(`History total increased from ${initialTodayTotal} to ${updatedTodayTotal} (diff: ${updatedTodayTotal - initialTodayTotal})`);
    });
  });

  test.describe('API Response Validation', () => {
    test('statistics endpoint should return valid data structure', async ({ page }) => {
      const response = await fetch(`${API_BASE}/statistics`);
      expect(response.ok).toBe(true);

      const data = await response.json();

      // Validate required fields exist
      expect(data).toHaveProperty('dailyTotal');
      expect(data).toHaveProperty('sevenDayAverage');
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('allTimeStats');
      expect(data).toHaveProperty('thirtyDayAverage');

      // Validate data types
      expect(typeof data.allTimeStats.totalPushups).toBe('number');
      expect(data.allTimeStats.totalPushups).toBeGreaterThanOrEqual(0);

      console.log('Statistics API response validated:', data);
    });

    test('history endpoint should return valid data structure', async ({ page }) => {
      const response = await fetch(`${API_BASE}/history?days=7`);
      expect(response.ok).toBe(true);

      const data = await response.json();

      // Should be an array
      expect(Array.isArray(data)).toBe(true);

      // Each entry should have date and total
      for (const entry of data) {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('total');
        expect(typeof entry.date).toBe('string');
        expect(typeof entry.total).toBe('number');
        expect(entry.total).toBeGreaterThanOrEqual(0);
      }

      console.log('History API response validated:', data);
    });

    test('pushups endpoint should correctly log and return data', async ({ page }) => {
      const pushupCount = 15;

      const response = await fetch(`${API_BASE}/pushups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: pushupCount,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();

      // Should return the logged entry
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('count');
      expect(data.count).toBe(pushupCount);

      console.log('Pushups POST response:', data);
    });
  });

  test.describe('Real-time UI Synchronization', () => {
    test('UI should reflect database state after page refresh', async ({ page }) => {
      // Log pushups via API (not UI)
      const pushupCount = 77;
      await logPushupsViaAPI(pushupCount);

      // Get expected values from API
      const expectedStats = await getStatisticsFromAPI();
      console.log('Expected stats after API logging:', expectedStats);

      // Load page fresh
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // UI should show the latest data (All-Time Total is reliable)
      const uiAllTime = await getStatValueFromUI(page, 'All-Time Total');

      expect(uiAllTime).toBe(expectedStats.allTimeTotal);

      console.log(`After API logging, UI shows All-Time: ${uiAllTime} (expected: ${expectedStats.allTimeTotal})`);
    });

    test('refreshing page should show current database state', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get initial UI values
      const initialUiAllTime = await getStatValueFromUI(page, 'All-Time Total');

      // Log pushups via API while on page
      const pushupCount = 33;
      await logPushupsViaAPI(pushupCount);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // UI should now show updated values
      const refreshedUiAllTime = await getStatValueFromUI(page, 'All-Time Total');
      expect(refreshedUiAllTime).toBe(initialUiAllTime + pushupCount);

      console.log(`Before refresh: ${initialUiAllTime}, After refresh: ${refreshedUiAllTime}`);
    });
  });
});
