import puppeteer from 'puppeteer-core';
import path from 'path';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
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
  await new Promise((r) => setTimeout(r, 1200));

  const artifactDir = '/Users/keithmisson/.gemini/antigravity-ide/brain/a04c8d48-0b98-46e4-919d-199df8c6b893';

  // 1. Click Guides Tab
  console.log('Switching to Guides tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.nav-link'));
    const guideTab = tabs.find(t => t.textContent && t.textContent.includes('Guides'));
    if (guideTab) guideTab.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const desktopScreenshot = path.join(artifactDir, 'guides_desktop_view.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log('Captured desktop guides screenshot at:', desktopScreenshot);

  // 2. Test Search in Guides
  console.log('Testing search filter with query "password"...');
  await page.type('.guides-search-input', 'password');
  await new Promise((r) => setTimeout(r, 800));

  const searchScreenshot = path.join(artifactDir, 'guides_search_filter.png');
  await page.screenshot({ path: searchScreenshot, fullPage: true });
  console.log('Captured guides search screenshot at:', searchScreenshot);

  // 3. Test Mobile View
  console.log('Testing mobile viewport (390px)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const clearBtn = document.querySelector('.guides-search-input');
    if (clearBtn) {
      clearBtn.value = '';
      clearBtn.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));

  const mobileScreenshot = path.join(artifactDir, 'guides_mobile_view.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  console.log('Captured mobile guides screenshot at:', mobileScreenshot);

  const title = await page.title();
  console.log('Page title:', title);
  await browser.close();
  console.log('Guides browser test complete.');
}

main().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
