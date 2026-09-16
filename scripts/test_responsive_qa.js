const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'phone-320', width: 320, height: 800 },
  { name: 'phone-375', width: 375, height: 812 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'laptop-1280', width: 1280, height: 720 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'laptop-1440', width: 1440, height: 900 },
  { name: 'desktop-1600', width: 1600, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'large-2560', width: 2560, height: 1440 },
];

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDetailedQA() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const summary = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      // Check with overflow-x: visible on html and body to detect true element leaks
      const audit = await page.evaluate(() => {
        // First, check natural scrollWidth
        const naturalDocScrollWidth = document.documentElement.scrollWidth;
        const naturalBodyScrollWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;

        // Temporarily reset overflow on html/body to see if anything forces page wide
        const origHtmlOverflow = document.documentElement.style.overflowX;
        const origBodyOverflow = document.body.style.overflowX;
        document.documentElement.style.overflowX = 'visible';
        document.body.style.overflowX = 'visible';

        const unclippedDocScrollWidth = document.documentElement.scrollWidth;
        const unclippedBodyScrollWidth = document.body.scrollWidth;

        // Restore
        document.documentElement.style.overflowX = origHtmlOverflow;
        document.body.style.overflowX = origBodyOverflow;

        // Find elements that actually push beyond innerWidth that are NOT inside an overflow: hidden/auto container
        function isScrollContainer(node) {
          if (!node || node === document.documentElement || node === document.body) return false;
          const style = window.getComputedStyle(node);
          return (
            style.overflowX === 'auto' ||
            style.overflowX === 'scroll' ||
            style.overflowX === 'hidden'
          );
        }

        function hasScrollContainerAncestor(node) {
          let p = node.parentElement;
          while (p && p !== document.body && p !== document.documentElement) {
            if (isScrollContainer(p)) return true;
            p = p.parentElement;
          }
          return false;
        }

        const leakingElements = [];
        document.querySelectorAll('body *').forEach((el) => {
          if (hasScrollContainerAncestor(el)) return; // Contained scroll children are expected
          const rect = el.getBoundingClientRect();
          if (rect.right > innerWidth + 1) {
            leakingElements.push({
              tag: el.tagName.toLowerCase(),
              className: (el.className || '').toString().slice(0, 50),
              id: el.id || '',
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              left: Math.round(rect.left),
            });
          }
        });

        // Bottom nav overlap check: does main feed have enough padding-bottom?
        const bottomNav = document.querySelector('.mobile-bottom-bar');
        const mainFeed = document.querySelector('.app-center-feed');
        let bottomNavHeight = 0;
        let mainFeedPaddingBottom = 0;
        let bottomNavVisible = false;

        if (bottomNav) {
          const navStyle = window.getComputedStyle(bottomNav);
          bottomNavVisible = navStyle.display !== 'none';
          if (bottomNavVisible) {
            bottomNavHeight = bottomNav.getBoundingClientRect().height;
          }
        }
        if (mainFeed) {
          const feedStyle = window.getComputedStyle(mainFeed);
          mainFeedPaddingBottom = parseFloat(feedStyle.paddingBottom) || 0;
        }

        // Check topbar header items
        const topbar = document.querySelector('.app-topbar');
        const topbarLeft = document.querySelector('.topbar-left');
        const topbarRight = document.querySelector('.topbar-right');
        const searchContainer = document.querySelector('.global-search-container');
        const createBtn = document.querySelector('.topbar-create-btn');

        return {
          innerWidth,
          naturalDocScrollWidth,
          unclippedDocScrollWidth,
          hasPageOverflow: unclippedDocScrollWidth > innerWidth,
          leakingElements: leakingElements.slice(0, 10),
          bottomNavVisible,
          bottomNavHeight,
          mainFeedPaddingBottom,
          isBottomNavCoveringContent: bottomNavVisible && (mainFeedPaddingBottom < bottomNavHeight),
          topbarRect: topbar ? { width: topbar.getBoundingClientRect().width } : null,
          topbarLeftRect: topbarLeft ? { width: topbarLeft.getBoundingClientRect().width, right: topbarLeft.getBoundingClientRect().right } : null,
          topbarRightRect: topbarRight ? { width: topbarRight.getBoundingClientRect().width, left: topbarRight.getBoundingClientRect().left } : null,
          searchWidth: searchContainer ? Math.round(searchContainer.getBoundingClientRect().width) : 0,
        };
      });

      console.log(`  innerWidth: ${audit.innerWidth}, unclippedDocScrollWidth: ${audit.unclippedDocScrollWidth}`);
      console.log(`  Page overflow: ${audit.hasPageOverflow ? 'FAIL' : 'PASS'}`);
      if (audit.leakingElements.length > 0) {
        console.log('  Leaking elements:');
        audit.leakingElements.forEach((e) => {
          console.log(`    ${e.tag}.${e.className} (left=${e.left}, right=${e.right}, width=${e.width})`);
        });
      }
      if (audit.bottomNavVisible) {
        console.log(`  Bottom nav visible: height=${audit.bottomNavHeight}px, feed pb=${audit.mainFeedPaddingBottom}px`);
        if (audit.isBottomNavCoveringContent) {
          console.log('  WARNING: Bottom navigation may cover content!');
        }
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotPath}`);

      summary.push({
        viewport: vp.name,
        width: vp.width,
        pass: !audit.hasPageOverflow && !audit.isBottomNavCoveringContent && audit.leakingElements.length === 0,
        audit,
      });
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      summary.push({ viewport: vp.name, width: vp.width, pass: false, error: err.message });
    }

    await context.close();
  }

  await browser.close();

  console.log('\n=======================================');
  console.log('          QA SUMMARY REPORT            ');
  console.log('=======================================');
  let passCount = 0;
  for (const s of summary) {
    const status = s.pass ? 'PASS' : 'FAIL';
    console.log(`${status} | ${s.viewport.padEnd(14)} | width=${s.width} | overflow=${s.audit?.hasPageOverflow ? 'YES' : 'NO'} | leaking=${s.audit?.leakingElements?.length || 0}`);
    if (s.pass) passCount++;
  }
  console.log(`\nTOTAL: ${passCount} / ${summary.length} passed.`);
}

runDetailedQA().catch(console.error);
