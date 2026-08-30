import puppeteer from 'puppeteer-core';
import path from 'path';

async function runTest() {
  console.log('Launching installed Google Chrome on macOS...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

  // Fill login
  await page.type('input[type="email"]', 'demo_mobile@atelier.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // Wait for login and nav-link
  await page.waitForSelector('.nav-link', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Switch to My Profile tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.nav-link'));
    const profTab = tabs.find(t => t.textContent && t.textContent.includes('My Profile'));
    if (profTab) profTab.click();
  });
  await new Promise((r) => setTimeout(r, 2000));

  await page.setViewport({ width: 390, height: 844 });

  const artifactDir = '/Users/keithmisson/.gemini/antigravity-ide/brain/a04c8d48-0b98-46e4-919d-199df8c6b893';
  const screenshotPath = path.join(artifactDir, 'profile_mobile_after.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Captured mobile profile screenshot at:', screenshotPath);

  const title = await page.title();
  console.log('Page title:', title);

  await browser.close();
  console.log('Browser test complete.');
}

runTest().catch((err) => {
  console.error('Browser automation error:', err);
  process.exit(1);
});
