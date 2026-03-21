import { test, expect } from '@playwright/test';

test('address selection on production', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('1. Navigate to app...');
  await page.goto('https://app.mapyourhealth.info', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('2. Search for address...');
  const searchInput = page.locator('input').first();
  await searchInput.click();
  await searchInput.fill('17 Godfrey Ave, Bayville NY');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/addr-1-dropdown.png' });

  console.log('3. Look for address result...');
  const addressButton = page.getByRole('button', { name: /Select.*Godfrey/i });
  const isVisible = await addressButton.isVisible().catch(() => false);
  console.log('   Address button visible:', isVisible);

  if (isVisible) {
    console.log('4. Click address result...');
    await addressButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/addr-2-after-click.png' });

    const inputValue = await searchInput.inputValue();
    console.log('   Input value after click:', inputValue);

    // Check if location header changed
    const locationText = await page.locator('text=New York').first().isVisible().catch(() => false);
    console.log('   New York visible:', locationText);
  } else {
    console.log('   No address button found');
    const allButtons = await page.locator('button').allTextContents();
    console.log('   All buttons:', allButtons.slice(0, 5));
  }

  await context.close();
});
