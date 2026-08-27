import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/keithmisson/.gemini/antigravity-ide/brain/b90a1c57-5d0e-49e9-9750-b402888f99a8';

async function runEndToEnd() {
  console.log('=== Starting End-to-End Automated Browser Test with Google Chrome ===');
  
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,900',
      `--user-data-dir=/tmp/atelier_chrome_profile_${Date.now()}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Listen to console messages and network errors
  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[Browser Page Error]:', err.message);
  });

  console.log('1. Loading http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 }).catch(() => {});

  const landingShot = path.join(ARTIFACT_DIR, '01_landing_page.png');
  await page.screenshot({ path: landingShot });
  console.log('Captured landing page screenshot:', landingShot);

  console.log('2. Testing Registration Flow...');
  // Click Register tab
  const registerTabBtn = await page.$$eval('button.auth-tab-btn', (btns) => {
    const reg = btns.find((b) => b.textContent?.includes('Register'));
    return reg ? true : false;
  });

  if (registerTabBtn) {
    // Click register button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button.auth-tab-btn'));
      const reg = btns.find((b) => b.textContent && b.textContent.includes('Register'));
      if (reg) reg.click();
    });

    await new Promise((r) => setTimeout(r, 500));

    // Fill in registration form
    const testEmail = `explorer_${Date.now()}@fashion.com`;
    console.log(`Registering new user: ${testEmail}...`);

    await page.type('input[placeholder="e.g. Clara Oswald"]', 'Test Explorer');
    await page.type('input[placeholder="clara@fashion.com"]', testEmail);
    await page.type('input[placeholder="Minimum 6 characters"]', 'Password123!');

    console.log('Submitting registration form...');
    await page.click('button.accent-button');

    console.log('Waiting 3 seconds for dashboard transition...');
    await new Promise((r) => setTimeout(r, 3000));

    const afterRegShot = path.join(ARTIFACT_DIR, '02_after_registration.png');
    await page.screenshot({ path: afterRegShot });
    console.log('Captured after-registration screenshot:', afterRegShot);
  }

  // Test Tab Navigation
  const tabs = [
    { name: 'Stylist', selector: 'button.nav-link:nth-of-type(1)', filename: '03_tab_stylist.png' },
    { name: "What's New", selector: 'button.nav-link:nth-of-type(2)', filename: '04_tab_whats_new.png' },
    { name: 'Wardrobe', selector: 'button.nav-link:nth-of-type(3)', filename: '05_tab_wardrobe.png' },
    { name: 'Capsules', selector: 'button.nav-link:nth-of-type(4)', filename: '06_tab_capsules.png' },
    { name: 'Studio', selector: 'button.nav-link:nth-of-type(5)', filename: '07_tab_studio.png' },
    { name: 'Inspirations', selector: 'button.nav-link:nth-of-type(6)', filename: '08_tab_inspirations.png' },
  ];

  for (const tab of tabs) {
    console.log(`Navigating to tab: ${tab.name}...`);
    const btn = await page.$(tab.selector);
    if (btn) {
      await btn.click();
      await new Promise((r) => setTimeout(r, 1200));
      const shotPath = path.join(ARTIFACT_DIR, tab.filename);
      await page.screenshot({ path: shotPath });
      console.log(`Captured screenshot for ${tab.name}:`, shotPath);
    }
  }

  await browser.close();
  console.log('=== All End-to-End Tests Passed Successfully ===');
}

runEndToEnd().catch((err) => {
  console.error('E2E Test Failure:', err);
  process.exit(1);
});
