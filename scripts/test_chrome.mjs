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

  // 1. Stylist tab (check Change Weather button)
  console.log('Switching to Stylist tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.nav-link'));
    const stylistTab = tabs.find(t => t.textContent && t.textContent.trim() === 'Stylist');
    if (stylistTab) stylistTab.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const stylistScreenshot = path.join(artifactDir, 'stylist_change_weather.png');
  await page.screenshot({ path: stylistScreenshot, fullPage: false });
  console.log('Captured Stylist tab screenshot at:', stylistScreenshot);

  // 2. My Profile tab (check Profile Guide button and Sign Out placement)
  console.log('Switching to My Profile tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.nav-link'));
    const profileTab = tabs.find(t => t.textContent && t.textContent.trim() === 'My Profile');
    if (profileTab) profileTab.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const profileScreenshot = path.join(artifactDir, 'profile_updated_signout.png');
  await page.screenshot({ path: profileScreenshot, fullPage: true });
  console.log('Captured Profile tab screenshot at:', profileScreenshot);

  const title = await page.title();
  console.log('Page title:', title);
  await browser.close();
  console.log('Local Chrome test complete.');
}

main().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
