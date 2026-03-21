import { test, expect } from '@playwright/test';

test('debug address selection on local', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    // Print Places-related logs immediately
    if (text.includes('[Places]') || text.includes('[Search]')) {
      console.log(`CONSOLE: ${text}`);
    }
  });

  console.log('1. Navigate to local app...');
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for React to initialize

  console.log('2. Search for address...');
  const searchInput = page.locator('input').first();
  await searchInput.click();
  await searchInput.fill('17 Godfrey Ave, Bayville NY');
  await page.waitForTimeout(4000);

  console.log('3. Look for dropdown items...');
  const suggestionItems = page.locator('button:has-text("Godfrey")');
  const count = await suggestionItems.count();
  console.log('   Suggestion count:', count);

  if (count > 0) {
    const firstSuggestion = suggestionItems.first();
    const buttonText = await firstSuggestion.textContent();
    console.log('   First suggestion text:', buttonText);

    console.log('4. Click suggestion...');
    await firstSuggestion.click();

    // Wait for async operations
    await page.waitForTimeout(5000);

    console.log('5. Check state after click...');
    await page.screenshot({ path: '/tmp/addr-local-after.png' });

    const inputValue = await searchInput.inputValue();
    console.log('   Input value after:', inputValue);

    // Check for category list
    const categoryCount = await page.locator('text=/Water Quality|Air Pollution|General/').count();
    console.log('   Category items visible:', categoryCount);
  }

  // Print all Places-related logs
  console.log('\n--- All Places/Search logs ---');
  consoleLogs.filter(log => log.includes('[Places]') || log.includes('[Search]')).forEach(log => {
    console.log(log);
  });

  await context.close();
});
