import { chromium } from 'playwright';

async function runHydrationAudit() {
  console.log('===============================================================');
  console.log('  FEEDER.LIFE — HYDRATION MISMATCH & ROOT CAUSE AUDIT SUITE');
  console.log('===============================================================\n');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  function record(test: string, pass: boolean, details: string) {
    results.push({ test, status: pass ? 'PASS' : 'FAIL', details });
    const icon = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon}: ${test} — ${details}`);
  }

  // TEST 1: Launch normal browser with console log listening
  console.log('\n--- 1. NORMAL CHROME BROWSER HYDRATION TEST ---');
  const browserNormal = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const routesToTest = [
    { name: 'Login Page', url: 'http://localhost:3000/login' },
    { name: 'Home / Feed', url: 'http://localhost:3000/' },
    { name: 'Communities', url: 'http://localhost:3000/communities' },
    { name: 'Nearby Map', url: 'http://localhost:3000/nearby' },
    { name: 'Feeding Tracker', url: 'http://localhost:3000/feeding' },
    { name: 'SOS Emergency', url: 'http://localhost:3000/sos' },
    { name: 'Ask Feeder AI', url: 'http://localhost:3000/ask-feeder' },
    { name: 'Onboarding', url: 'http://localhost:3000/onboarding' },
    { name: 'Profile', url: 'http://localhost:3000/profile' },
  ];

  for (const route of routesToTest) {
    const consoleErrors: string[] = [];
    const context = await browserNormal.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    page.on('console', (msg) => {
      const txt = msg.text();
      if (
        msg.type() === 'error' ||
        txt.includes('hydration-mismatch') ||
        txt.includes('Hydration failed') ||
        txt.includes('did not match') ||
        txt.includes('Warning: Extra attributes')
      ) {
        consoleErrors.push(txt);
      }
    });

    await page.goto(route.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const hasHydrationError = consoleErrors.some(
      (e) => e.includes('hydration') || e.includes('did not match') || e.includes('Extra attributes')
    );

    record(
      `Normal Chrome: ${route.name}`,
      !hasHydrationError,
      hasHydrationError ? `Errors: ${consoleErrors.join(' | ')}` : 'Hydrated cleanly with 0 hydration errors'
    );
    await context.close();
  }

  await browserNormal.close();

  // TEST 2: INCOGNITO / EXTENSIONS DISABLED BROWSER
  console.log('\n--- 2. INCOGNITO & EXTENSIONS-DISABLED CHROME TEST ---');
  const browserIncognito = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-extensions', '--incognito'],
  });

  for (const route of routesToTest) {
    const consoleErrors: string[] = [];
    const context = await browserIncognito.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    page.on('console', (msg) => {
      const txt = msg.text();
      if (
        msg.type() === 'error' ||
        txt.includes('hydration-mismatch') ||
        txt.includes('Hydration failed') ||
        txt.includes('did not match')
      ) {
        consoleErrors.push(txt);
      }
    });

    await page.goto(route.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const hasHydrationError = consoleErrors.some(
      (e) => e.includes('hydration') || e.includes('did not match')
    );

    record(
      `Incognito & No-Extensions: ${route.name}`,
      !hasHydrationError,
      hasHydrationError ? `Errors: ${consoleErrors.join(' | ')}` : '0 hydration errors'
    );
    await context.close();
  }

  // TEST 3: EXTENSION ATTRIBUTE INJECTION RESILIENCE SIMULATION
  console.log('\n--- 3. BROWSER EXTENSION ATTRIBUTE INJECTION RESILIENCE TEST ---');
  {
    const consoleErrors: string[] = [];
    const context = await browserIncognito.newContext({ viewport: { width: 1440, height: 900 } });
    
    // Simulate extension injecting __processed_... attribute into body before hydration
    await context.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.setAttribute('__processed_0be6b621-9db0-4b62-97ff-0e83618fccb2__', 'true');
        document.body.setAttribute('cz-shortcut-listen', 'true');
      });
    });

    const page = await context.newPage();
    page.on('console', (msg) => {
      const txt = msg.text();
      if (
        msg.type() === 'error' ||
        txt.includes('hydration-mismatch') ||
        txt.includes('Hydration failed') ||
        txt.includes('did not match')
      ) {
        consoleErrors.push(txt);
      }
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const hasHydrationError = consoleErrors.some(
      (e) => e.includes('hydration') || e.includes('did not match') || e.includes('Extra attributes')
    );

    record(
      'Extension Injected Body Attribute Resilience',
      !hasHydrationError,
      !hasHydrationError
        ? 'Extension injected __processed_* attribute handled cleanly with suppressHydrationWarning'
        : `Hydration error logged: ${consoleErrors.join(' | ')}`
    );
    await context.close();
  }

  // TEST 4: RESPONSIVE VIEWPORT & SCROLL AUDIT
  console.log('\n--- 4. RESPONSIVE VIEWPORTS & LOGIN SCROLL AUDIT ---');
  const viewports = [
    { name: 'Mobile iPhone (375x812)', w: 375, h: 812, isDesktop: false },
    { name: 'Mobile Android (430x932)', w: 430, h: 932, isDesktop: false },
    { name: 'Desktop HD (1024x768)', w: 1024, h: 768, isDesktop: true },
    { name: 'Desktop Full HD (1920x1080)', w: 1920, h: 1080, isDesktop: true },
  ];

  for (const vp of viewports) {
    const context = await browserIncognito.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      return {
        hScroll: document.documentElement.scrollWidth > window.innerWidth,
        vScroll: document.documentElement.scrollHeight > window.innerHeight,
        scrollH: document.documentElement.scrollHeight,
        innerH: window.innerHeight,
      };
    });

    const pass = !metrics.hScroll && (!vp.isDesktop || !metrics.vScroll);
    record(
      `Login Viewport: ${vp.name}`,
      pass,
      `Horizontal Scroll: ${metrics.hScroll ? 'FAIL' : 'NONE'}, Vertical Scroll: ${metrics.vScroll ? 'YES' : 'NONE'} (h=${metrics.scrollH}/${metrics.innerH})`
    );
    await context.close();
  }

  await browserIncognito.close();

  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = total - passed;
  console.log(`HYDRATION AUDIT COMPLETE: ${passed} / ${total} PASSED (${failed} FAILED)`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHydrationAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
