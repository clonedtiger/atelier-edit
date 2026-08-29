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

  console.log('Navigating to https://atelier-edit.web.app...');
  await page.goto('https://atelier-edit.web.app', { waitUntil: 'networkidle2', timeout: 30000 });

  const artifactDir = '/Users/keithmisson/.gemini/antigravity-ide/brain/b90a1c57-5d0e-49e9-9750-b402888f99a8';
  const screenshotPath = path.join(artifactDir, 'chrome_test_page.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Captured screenshot at:', screenshotPath);

  const title = await page.title();
  console.log('Page title:', title);

  await browser.close();
  console.log('Browser test complete.');
}

runTest().catch((err) => {
  console.error('Browser automation error:', err);
  process.exit(1);
});
