const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const playwright = require(process.env.SWAY_PLAYWRIGHT_MODULE || 'playwright');
const AxeBuilder = require(process.env.SWAY_AXE_MODULE || '@axe-core/playwright').default;

(async () => {
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.SWAY_CHROMIUM_PATH ? { executablePath: process.env.SWAY_CHROMIUM_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const audit = async name => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
    const violations = result.violations.map(x => ({ id: x.id, impact: x.impact, description: x.description, nodes: x.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }));
    if (violations.length) console.error(JSON.stringify({ screen: name, violations }, null, 2));
    assert.equal(violations.length, 0, name + ' accessibility violations');
    console.log('PASS accessibility:', name);
  };
  try {
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    await audit('setup');
    await page.locator('#demo').click(); await page.locator('#start').click();
    await page.waitForFunction(() => document.getElementById('pending').hidden);
    await audit('quick pick');
    await page.locator('#mode-continuous').click(); await audit('fine tune');
    await page.setViewportSize({ width: 360, height: 800 }); await audit('fine tune mobile');
    await page.locator('#see-order').click(); await audit('results mobile');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
