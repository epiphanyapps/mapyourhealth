import { test, expect } from '@playwright/test';

test('debug address selection', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture network errors
  page.on('response', response => {
    if (!response.ok() && response.url().includes('graphql')) {
      console.log('GraphQL Error:', response.status(), response.url());
    }
  });

  console.log('1. Navigate to app...');
  await page.goto('https://app.mapyourhealth.info', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('2. Search for address...');
  const searchInput = page.locator('input').first();
  await searchInput.click();
  await searchInput.fill('17 Godfrey Ave, Bayville NY');
  await page.waitForTimeout(3000);

  console.log('3. Look for dropdown items...');
  // Wait for suggestions
  const suggestionItems = page.locator('button:has-text("Godfrey")');
  const count = await suggestionItems.count();
  console.log('   Suggestion count:', count);

  if (count > 0) {
    const firstSuggestion = suggestionItems.first();
    const buttonText = await firstSuggestion.textContent();
    console.log('   First suggestion text:', buttonText);

    console.log('4. Click suggestion...');
    await firstSuggestion.click();

    // Wait for any async operations
    await page.waitForTimeout(5000);

    console.log('5. Check state after click...');
    await page.screenshot({ path: '/tmp/addr-debug-after.png' });

    const inputValue = await searchInput.inputValue();
    console.log('   Input value after:', inputValue);

    // Check for any visible location header
    const headerText = await page.locator('h1, h2, h3').allTextContents();
    console.log('   Headers:', headerText);

    // Check for category list (which shows when a location is selected)
    const categoryCount = await page.locator('text=/Water Quality|Air Pollution|General/').count();
    console.log('   Category items:', categoryCount);
  }

  // Print console logs
  console.log('\n--- Console logs from page ---');
  consoleLogs.filter(log => log.includes('[Places]') || log.includes('[Search]') || log.includes('Error')).forEach(log => {
    console.log(log);
  });

  await context.close();
});
