const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  // PHONE
  { name: 'Phone 320x800', width: 320, height: 800, category: 'PHONE' },
  { name: 'Phone 375x812', width: 375, height: 812, category: 'PHONE' },
  { name: 'Phone 390x844', width: 390, height: 844, category: 'PHONE' },
  { name: 'Phone 430x932', width: 430, height: 932, category: 'PHONE' },
  // TABLET
  { name: 'Tablet 768x1024', width: 768, height: 1024, category: 'TABLET' },
  { name: 'Tablet 820x1180', width: 820, height: 1180, category: 'TABLET' },
  // LAPTOP
  { name: 'Laptop 1024x768', width: 1024, height: 768, category: 'LAPTOP' },
  { name: 'Laptop 1280x720', width: 1280, height: 720, category: 'LAPTOP' },
  { name: 'Laptop 1366x768', width: 1366, height: 768, category: 'LAPTOP' },
  { name: 'Laptop 1440x900', width: 1440, height: 900, category: 'LAPTOP' },
  // DESKTOP
  { name: 'Desktop 1600x900', width: 1600, height: 900, category: 'DESKTOP' },
  { name: 'Desktop 1920x1080', width: 1920, height: 1080, category: 'DESKTOP' },
  // LARGE SCREEN
  { name: 'Large 2560x1440', width: 2560, height: 1440, category: 'LARGE_SCREEN' },
];

const ROUTES = [
  '/',
  '/communities',
  '/sos',
  '/nearby',
  '/feeding',
  '/ask-feeder',
];

async function runComprehensiveQA() {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  let totalTests = 0;
  let passedTests = 0;

  console.log('====================================================');
  console.log('FEEDER.LIFE — COMPREHENSIVE RESPONSIVE SUITE');
  console.log('====================================================\n');

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width <= 430 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' : undefined,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      totalTests++;
      const url = `${BASE_URL}${route}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        const check = await page.evaluate(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const innerWidth = window.innerWidth;
          const maxScroll = Math.max(docScrollWidth, bodyScrollWidth);
          const hasHorizontalOverflow = maxScroll > innerWidth + 1;

          // Check for stories rail scrollability if on home page
          const storyRail = document.querySelector('.stories-rail-scroll');
          const storyRailScrollable = storyRail ? storyRail.scrollWidth >= storyRail.clientWidth : true;

          // Check bottom navigation visibility on mobile vs desktop
          const bottomNav = document.querySelector('.mobile-bottom-bar');
          const bottomNavDisplay = bottomNav ? window.getComputedStyle(bottomNav).display : 'none';

          // Check header alignment
          const topbar = document.querySelector('.app-topbar');
          const topbarWidth = topbar ? topbar.getBoundingClientRect().width : 0;

          return {
            scrollWidth: maxScroll,
            innerWidth,
            hasHorizontalOverflow,
            storyRailScrollable,
            bottomNavDisplay,
            topbarWidth,
          };
        });

        const pass = !check.hasHorizontalOverflow;
        if (pass) passedTests++;

        const status = pass ? 'PASS' : 'FAIL';
        console.log(`  [${status}] ${route} | scrollWidth=${check.scrollWidth} | innerWidth=${check.innerWidth}`);

        results.push({
          viewport: vp.name,
          category: vp.category,
          width: vp.width,
          height: vp.height,
          route,
          pass,
          scrollWidth: check.scrollWidth,
          innerWidth: check.innerWidth,
          bottomNav: check.bottomNavDisplay,
        });

        // Capture screenshot of home page for reference
        if (route === '/') {
          const safeName = vp.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          await page.screenshot({ path: path.join(screenshotsDir, `feed_${safeName}.png`) });
        }
      } catch (err) {
        console.log(`  [ERROR] ${route}: ${err.message}`);
        results.push({
          viewport: vp.name,
          category: vp.category,
          width: vp.width,
          height: vp.height,
          route,
          pass: false,
          error: err.message,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED`);
  console.log('====================================================');

  return { totalTests, passedTests, results };
}

runComprehensiveQA()
  .then((res) => {
    if (res.passedTests === res.totalTests) {
      console.log('\n>>> ALL RESPONSIVE VIEWPORT TESTS PASSED PERFECTLY! <<<');
      process.exit(0);
    } else {
      console.error('\n>>> SOME TESTS FAILED! <<<');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
