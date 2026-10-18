/* Optional browser harness. Requires Playwright; the application itself has no dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const playwright = require(process.env.SWAY_PLAYWRIGHT_MODULE || 'playwright');
const kind = process.env.SWAY_BROWSER || 'chromium';
const url = pathToFileURL(path.join(__dirname, '../index.html')).href;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'sway-review-'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await playwright[kind].launch({
    headless: true,
    ...(kind === 'chromium' && process.env.SWAY_CHROMIUM_PATH ? { executablePath: process.env.SWAY_CHROMIUM_PATH } : {}),
    ...(kind === 'firefox' && process.env.SWAY_FIREFOX_PATH ? { executablePath: process.env.SWAY_FIREFOX_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [], remote = [];
  let acceptDialogs = true, groups = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  page.on('dialog', dialog => acceptDialogs ? dialog.accept() : dialog.dismiss());
  const ready = async () => { await page.waitForFunction(() => document.getElementById('pending').hidden); await sleep(400); };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem(Session.KEY)));
  const click = async id => { await page.locator('#' + id).click(); await ready(); };
  const test = async (name, run) => { await run(); groups++; console.log(`PASS ${kind}: ${name}`); };
  const screenshot = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  const importState = async state => {
    await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)) });
    await page.waitForFunction(expected => {
      const saved = JSON.parse(localStorage.getItem(Session.KEY));
      return saved?.id === expected.id && saved.observations.length === expected.count && document.getElementById('pending').hidden;
    }, { id: state.id, count: state.observations.length });
    await ready();
  };
  try {
    await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
    await test('setup validation, example, and first-use map', async () => {
      await screenshot('setup-desktop');
      await page.locator('#names').fill('Same\nsame'); await click('start');
      assert.match(await page.locator('#input-error').textContent(), /unique/);
      await click('demo'); assert.equal(await page.locator('.chip').count(), 6);
      await page.locator('.chip button').first().click(); assert.equal(await page.locator('.chip').count(), 5);
      await click('demo'); await click('start');
      assert.equal(await page.locator('#live-map li').count(), 6);
      assert.equal(await page.locator('#live-map li:visible').count(), 5);
      assert.equal(await page.locator('#live-map .row-score').first().textContent(), '—');
      await click('toggle-map'); assert.equal(await page.locator('#live-map li:visible').count(), 6);
      await click('toggle-map');
    });
    await test('quick choice, receipt, history and duplicate protection', async () => {
      await page.evaluate(() => { document.getElementById('left').click(); document.getElementById('right').click(); }); await ready();
      assert.equal((await saved()).observations.length, 1);
      assert.match(await page.locator('#choice-receipt').textContent(), /Last recorded:/);
      assert.equal(await page.locator('#history-list li').count(), 1);
      await screenshot('quick-desktop');
    });
    await test('slider previews, endpoints, tie, and keyboard submission', async () => {
      await click('mode-continuous'); assert(await page.locator('#record').isDisabled());
      await page.locator('#strength').fill('-75');
      assert.equal((await saved()).observations.length, 1);
      await page.locator('#strength').press('Enter'); await ready();
      assert.equal((await saved()).observations.at(-1).value, .75);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'strength');
      await click('right'); assert.equal(await page.locator('#strength').inputValue(), '100');
      assert.equal((await saved()).observations.length, 2);
      await click('record'); assert.equal((await saved()).observations.at(-1).value, -1);
      await click('tie'); assert.equal((await saved()).observations.at(-1).value, 0);
    });
    await test('skip, exact undo and stable reload', async () => {
      const before = await saved(); await click('skip');
      assert.equal((await saved()).observations.length, before.observations.length);
      assert.notEqual((await saved()).pair.sort().join(), before.pair.sort().join());
      await click('undo'); assert.equal((await saved()).observations.length, before.observations.length - 1);
      assert.deepEqual((await saved()).pair, [before.observations.at(-1).a, before.observations.at(-1).b]);
      const map = await page.locator('#live-map').textContent();
      await page.reload(); await ready(); assert.equal(await page.locator('#live-map').textContent(), map);
    });
    await test('shortcuts are scoped to the comparison and retain focus', async () => {
      await click('mode-binary'); const count = (await saved()).observations.length;
      await page.locator('#session-title').focus(); await page.keyboard.press('e'); await ready();
      assert.equal((await saved()).observations.length, count);
      await page.locator('#left').focus(); await page.keyboard.press('ArrowLeft'); await ready();
      assert.equal((await saved()).observations.length, count + 1);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'left');
      const heldBefore = (await saved()).observations.length;
      await page.keyboard.down('Enter'); await ready(); await page.keyboard.down('Enter'); await ready(); await page.keyboard.up('Enter');
      assert.equal((await saved()).observations.length, heldBefore + 1);
    });
    await test('results, exports, and resume', async () => {
      await click('see-order'); assert(await page.locator('#results').isVisible());
      await screenshot('results-desktop');
      for (const action of ['backup', 'csv']) {
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`#results [data-action="${action}"]`).first().click()]);
        const file = await download.path(), content = fs.readFileSync(file, 'utf8');
        if (action === 'backup') assert.equal(JSON.parse(content).observations.length, (await saved()).observations.length);
        else assert(content.includes('Expected percentile') && content.includes('Evidence'));
      }
      await page.reload(); await ready(); assert(await page.locator('#results').isVisible()); await click('resume');
    });
    await test('invalid and canceled replacement preserve current history', async () => {
      const before = await saved();
      await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') }); await ready();
      assert.match(await page.locator('#notice-text').textContent(), /valid JSON/);
      assert.equal((await saved()).id, before.id);
      await click('new-list'); await page.locator('#names').fill('New A\nNew B'); acceptDialogs = false;
      await click('start'); assert.equal((await saved()).id, before.id);
      acceptDialogs = true; await click('cancel-editor');
    });
    await test('worker failure is atomic and Retry records once', async () => {
      const before = (await saved()).observations.length;
      await page.evaluate(() => { window.originalPost = Worker.prototype.postMessage; Worker.prototype.postMessage = function () { throw Error('test failure'); }; });
      await click('left'); assert.equal((await saved()).observations.length, before);
      assert(await page.locator('#retry').isVisible());
      await page.evaluate(() => { Worker.prototype.postMessage = window.originalPost; });
      await click('retry'); assert.equal((await saved()).observations.length, before + 1);
    });
    await test('responsive layouts, readable text and touch targets', async () => {
      await click('mode-continuous');
      for (const width of [1440, 820, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const sizes = await page.evaluate(() => ['.row-name', '.map-description', '.stage-tools button', '.small'].map(selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)));
        assert(sizes.every(size => size >= 12));
        const controls = await page.locator('#stage button:visible').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
        assert(controls.every(height => height >= 44));
      }
      await screenshot('fine-mobile');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('#left').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    });
    await test('long names render as text and remain within the viewport', async () => {
      const state = await page.evaluate(() => Session.create(Session.parse('<img src=x onerror=alert(1)>\n' + 'x'.repeat(200))));
      await importState(state);
      assert.equal(await page.locator('#session img').count(), 0);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await click('mode-continuous'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
    await test('cross-tab writes never overwrite another saved session', async () => {
      const second = await context.newPage(); await second.goto(url);
      await second.waitForFunction(() => document.getElementById('pending').hidden);
      await click('tie'); const firstSaved = await saved();
      await second.waitForFunction(() => document.getElementById('notice-text').textContent.includes('Another tab'));
      await sleep(400); await second.locator('#tie').click();
      await second.waitForFunction(() => document.getElementById('pending').hidden);
      assert.equal(JSON.stringify(await saved()), JSON.stringify(firstSaved));
      assert.match(await second.locator('#save-status').textContent(), /In memory/);
      await second.close();
    });
    await test('quota failure remains usable and does not become a false conflict', async () => {
      await page.evaluate(() => { window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; });
      await click('tie'); assert.match(await page.locator('#notice-text').textContent(), /Autosave is unavailable/);
      await click('tie'); assert.match(await page.locator('#notice-text').textContent(), /Autosave is unavailable/);
      await page.evaluate(() => { Storage.prototype.setItem = window.originalSet; });
      await click('tie'); assert.equal(await page.locator('#save-status').textContent(), 'Saved on this device');
    });
    await test('simultaneous tab writes are serialized without silent replacement', async () => {
      assert(await page.evaluate(() => Boolean(navigator.locks?.request)), 'Web Locks must be available for this concurrency check');
      const second = await context.newPage(); await second.goto(url);
      await second.waitForFunction(() => document.getElementById('pending').hidden); await sleep(400);
      const before = (await saved()).observations.length;
      await Promise.all([
        page.evaluate(() => document.getElementById('tie').click()),
        second.evaluate(() => { document.getElementById('strength').value = '-80'; document.getElementById('strength').dispatchEvent(new Event('input')); document.getElementById('record').click(); }),
      ]);
      await ready(); await second.waitForFunction(() => document.getElementById('pending').hidden); await sleep(400);
      assert.equal((await saved()).observations.length, before + 1);
      const messages = await Promise.all([page.locator('#notice-text').textContent(), second.locator('#notice-text').textContent()]);
      assert(messages.some(text => text.includes('Another tab')));
      await second.close(); await page.reload(); await ready();
    });
    await test('50-item / 10,000-judgment history, limit, and undo', async () => {
      const state = await page.evaluate(() => Session.create(Session.parse(Array.from({ length: 50 }, (_, i) => 'Item ' + i).join('\n'))));
      for (let i = 0; i < 10000; i++) state.observations.push({ a: i % 50, b: (i + 1) % 50, kind: i % 2 ? 'binary' : 'continuous', value: i % 3 ? 1 : 0 });
      await importState(state); assert(await page.locator('#tie').isDisabled());
      assert.equal(await page.locator('#live-map li:visible').count(), 5);
      await click('toggle-map'); assert.equal(await page.locator('#live-map li:visible').count(), 50);
      await click('undo'); assert.equal((await saved()).observations.length, 9999); assert(await page.locator('#tie').isEnabled());
    });
    await test('canceled unload keeps the worker alive; corrupted saves recover', async () => {
      const before = (await saved()).observations.length;
      await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
      await click('tie'); assert.equal((await saved()).observations.length, before + 1);
      await page.evaluate(() => localStorage.setItem(Session.KEY, '{broken'));
      await page.reload(); await ready();
      assert(await page.locator('#setup').isVisible());
      assert.match(await page.locator('#notice-text').textContent(), /could not be restored/);
      await click('demo'); await click('start'); assert.equal((await saved()).observations.length, 0);
    });
    assert.deepEqual(errors, []); assert.deepEqual(remote, []);
    console.log(`${groups} ${kind} groups passed. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
