/**
 * Manual Swarm Intro Test — Screenshot & Verification
 * Run with: node test-swarm-intro.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('🚀 Starting Swarm Intro Tests...\n');

  const testDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    
    // TEST 1: First load - intro should appear
    console.log('📍 TEST 1: Intro appears on first load');
    let context = await browser.newContext();
    let page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const overlay = await page.locator('#swarm-overlay').isVisible();
    console.log(`  ✓ Overlay visible: ${overlay}`);
    
    const skipBtn = await page.locator('#swarm-skip').isVisible();
    console.log(`  ✓ Skip button visible: ${skipBtn}`);
    
    const progress = await page.locator('#swarm-progress').isVisible();
    console.log(`  ✓ Progress bar visible: ${progress}`);
    
    // Screenshot
    await page.screenshot({ path: path.join(testDir, '01-intro-load.png') });
    console.log(`  📸 Screenshot: 01-intro-load.png\n`);
    
    await context.close();
    
    // TEST 2: Skip button functionality
    console.log('📍 TEST 2: Skip button hides intro');
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    const skipButton = page.locator('#swarm-skip');
    await skipButton.click();
    await page.waitForTimeout(1500);
    
    const overlayHidden = await page.locator('#swarm-overlay').isVisible();
    console.log(`  ✓ Overlay hidden after skip: ${!overlayHidden}`);
    
    const navbar = await page.locator('.navbar').isVisible();
    console.log(`  ✓ Navbar visible after skip: ${navbar}`);
    
    await page.screenshot({ path: path.join(testDir, '02-after-skip.png') });
    console.log(`  📸 Screenshot: 02-after-skip.png\n`);
    
    await context.close();
    
    // TEST 3: sessionStorage flag
    console.log('📍 TEST 3: sessionStorage flag set after skip');
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    await page.locator('#swarm-skip').click();
    await page.waitForTimeout(1000);
    
    const flagValue = await page.evaluate(() => sessionStorage.getItem('swarm-intro-shown'));
    console.log(`  ✓ sessionStorage flag set: ${flagValue === 'true'}`);
    
    await context.close();
    
    // TEST 4: No repeat on reload
    console.log('📍 TEST 4: Intro does not repeat on reload');
    context = await browser.newContext();
    page = await context.newPage();
    
    // Set sessionStorage flag manually
    await page.goto('http://localhost:3000');
    await page.evaluate(() => sessionStorage.setItem('swarm-intro-shown', 'true'));
    
    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const overlayOnReload = await page.locator('#swarm-overlay').isVisible();
    console.log(`  ✓ Overlay does not appear on reload: ${!overlayOnReload}`);
    
    const navbarOnReload = await page.locator('.navbar').isVisible();
    console.log(`  ✓ Navbar visible immediately: ${navbarOnReload}`);
    
    await page.screenshot({ path: path.join(testDir, '03-no-repeat-reload.png') });
    console.log(`  📸 Screenshot: 03-no-repeat-reload.png\n`);
    
    await context.close();
    
    // TEST 5: Cursor rendering
    console.log('📍 TEST 5: Cursors rendered on intro');
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    
    const circleCount = await page.locator('#swarm-canvas circle').count();
    console.log(`  ✓ Cursor count: ${circleCount} (expected: 4-12)`);
    console.log(`  ✓ Cursors rendered: ${circleCount > 0}`);
    
    await page.screenshot({ path: path.join(testDir, '04-cursors-rendering.png') });
    console.log(`  📸 Screenshot: 04-cursors-rendering.png\n`);
    
    await context.close();
    
    // TEST 6: No console errors
    console.log('📍 TEST 6: No console errors');
    context = await browser.newContext();
    page = await context.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log(`  ✓ Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log(`    Errors:`, errors);
    }
    
    await context.close();
    
    // TEST 7: Website interactive after intro
    console.log('📍 TEST 7: Website interactive after intro');
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('#swarm-skip').click();
    await page.waitForTimeout(1500);
    
    const navLinkClickable = await page.locator('.nav-link').first().isEnabled();
    console.log(`  ✓ Nav links clickable: ${navLinkClickable}`);
    
    const downloadBtnClickable = await page.locator('.btn-primary').first().isEnabled();
    console.log(`  ✓ Download button clickable: ${downloadBtnClickable}`);
    
    await page.screenshot({ path: path.join(testDir, '05-interactive.png') });
    console.log(`  📸 Screenshot: 05-interactive.png\n`);
    
    await context.close();
    
    console.log('✅ All tests completed!');
    console.log(`📁 Results saved to: ${testDir}\n`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTests();
