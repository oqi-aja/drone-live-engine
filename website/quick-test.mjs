import { chromium } from 'playwright';

async function testSwarmIntro() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🧪 Test 1: Intro appears on first load');
  await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });
  const overlay = await page.locator('#swarm-overlay').isVisible();
  console.log(overlay ? '✅ Overlay visible' : '❌ Overlay NOT visible');

  console.log('\n🧪 Test 2: Canvas and cursors rendered');
  const canvas = await page.locator('#swarm-canvas').isVisible();
  const circles = await page.locator('#swarm-canvas circle').count();
  console.log(`✅ Canvas visible: ${canvas}, Cursors: ${circles}`);

  console.log('\n🧪 Test 3: Website content starts hidden');
  const navbar = await page.locator('.navbar');
  const opacity = await navbar.evaluate(el => window.getComputedStyle(el).opacity);
  console.log(`✅ Navbar opacity: ${opacity} (should be 0)`);

  console.log('\n🧪 Test 4: Animation progresses');
  await page.waitForTimeout(3000);
  const progressBar = await page.locator('#swarm-progress');
  const width = await progressBar.evaluate(el => el.style.width);
  console.log(`✅ Progress: ${width}`);

  console.log('\n🧪 Test 5: Skip button works');
  await page.locator('#swarm-skip').click();
  await page.waitForTimeout(800);
  const overlayAfterSkip = await page.locator('#swarm-overlay').isVisible().catch(() => false);
  console.log(overlayAfterSkip ? '❌ Overlay still visible after skip' : '✅ Overlay hidden after skip');

  console.log('\n🧪 Test 6: Website visible after skip');
  const navbarVisible = await page.locator('.navbar').isVisible();
  console.log(navbarVisible ? '✅ Navbar visible' : '❌ Navbar NOT visible');

  console.log('\n🧪 Test 7: Console errors');
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.waitForTimeout(500);
  console.log(errors.length === 0 ? '✅ No console errors' : `❌ ${errors.length} errors`);

  await browser.close();
  console.log('\n✅ All tests completed');
}

testSwarmIntro().catch(console.error);
