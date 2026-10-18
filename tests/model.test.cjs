const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const worker = html.match(/<script[^>]*id="engine-source"[^>]*>([\s\S]*?)<\/script>/)[1];
const application = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const context = vm.createContext({ self: {}, crypto: require('node:crypto').webcrypto });
vm.runInContext(worker + '\nglobalThis.M = Model;', context);
const bootstrap = application.search(/\n\s*\(\(\)\s*=>\s*\{/);
assert(bootstrap > 0, 'Application bootstrap must be separate from the session helpers');
vm.runInContext(application.slice(0, bootstrap) + '\nglobalThis.S = Session;', context);
const { M, S } = context;
const close = (a, b, tolerance = 1e-7) => assert(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const observation = (value, kind = 'binary', a = 0, b = 1) => ({ a, b, kind, value });

test('quadrature rules integrate probability and first two moments', () => {
  close(M.GH.reduce((s, q) => s + q.w, 0), 1);
  close(M.GH.reduce((s, q) => s + q.w * q.x, 0), 0);
  close(M.GH.reduce((s, q) => s + q.w * q.x ** 2, 0), 1);
  close(M.GL.reduce((s, q) => s + q.w, 0), 1);
  close(M.GL.reduce((s, q) => s + q.w * q.x, 0), .5);
});

test('continuous likelihood integrates to one and its derivatives agree', () => {
  for (const eta of [-100, -10, -1, -.05, -.049, 0, .049, .05, 1, 10, 100]) {
    const c = M.continuous(eta), h = 1e-5;
    assert(c.variance > 0 && c.mean > 0 && c.mean < 1);
    close(c.mean + M.continuous(-eta).mean, 1);
    close(M.GL.reduce((s, q) => s + q.w * Math.exp(eta * q.x - c.logZ), 0), 1);
    close((M.continuous(eta + h).logZ - M.continuous(eta - h).logZ) / (2 * h), c.mean, 1e-6);
    close((M.continuous(eta + h).mean - M.continuous(eta - h).mean) / (2 * h), c.variance, 1e-6);
  }
});

test('regression: 20 wins and 20 losses are 50/50 in any chronology', () => {
  const observations = Array.from({ length: 40 }, (_, i) => observation(Number(i < 20)));
  for (const history of [observations, [...observations].reverse(), observations.slice().sort((a, b) => a.value - b.value)]) {
    const p = M.fit(2, history);
    p.mean.forEach(x => close(x, 0));
    M.percentiles(p, 123).forEach(x => close(x.mean, 50));
  }
});

test('mixed evidence is order independent and warm starts preserve the posterior', () => {
  const random = M.rng(91), history = [];
  for (let i = 0; i < 120; i++) history.push(observation(i % 2 ? Number(random() > .4) : random() * 2 - 1, i % 2 ? 'binary' : 'continuous', i % 4, (i % 4 + 1) % 5));
  const cold = M.fit(5, history), reverse = M.fit(5, [...history].reverse());
  const warm = M.fit(5, history, M.fit(5, history.slice(0, -1)).mean);
  for (let i = 0; i < 5; i++) {
    close(cold.mean[i], reverse.mean[i]); close(cold.mean[i], warm.mean[i]);
    for (let j = 0; j < 5; j++) { close(cold.cov[i][j], reverse.cov[i][j]); close(cold.cov[i][j], warm.cov[i][j]); }
  }
});

test('analytic expected percentiles have no seed noise and conserve mean position', () => {
  const p = M.prior(5);
  for (const seed of [123, 456]) M.percentiles(p, seed).forEach(x => close(x.mean, 50));
  const learned = M.fit(5, [observation(1), observation(.7, 'continuous', 2, 4)]);
  const means = M.expectedPercentiles(learned);
  close(means.reduce((a, b) => a + b, 0), 250);
  const a = M.percentiles(learned, 1), b = M.percentiles(learned, 2);
  a.forEach((x, i) => close(x.mean, b[i].mean));
  assert.deepEqual(M.percentiles(learned, 4), M.percentiles(learned, 4));
});

test('permutation and presentation reversal preserve the same inference', () => {
  const obs = [observation(1), observation(-.5, 'continuous', 1, 2), observation(1, 'binary', 2, 0)];
  const p = M.fit(3, obs), swapped = M.fit(3, obs.map(o => ({ a: o.b, b: o.a, kind: o.kind, value: o.kind === 'binary' ? 1 - o.value : -o.value })));
  p.mean.forEach((x, i) => close(x, swapped.mean[i]));
  const permutation = [2, 0, 1];
  const relabeled = M.fit(3, obs.map(o => ({ ...o, a: permutation[o.a], b: permutation[o.b] })));
  M.expectedPercentiles(p).forEach((x, i) => close(x, M.expectedPercentiles(relabeled)[permutation[i]]));
});

test('Laplace pair probabilities agree with a numerical posterior reference', () => {
  for (const history of [[observation(1)], [observation(.5, 'continuous')], Array.from({ length: 15 }, (_, i) => observation(Number(i < 10)))]) {
    // Independent reference: integrate the one-dimensional posterior of d, whose prior is N(0, 2).
    let total = 0, positive = 0;
    const h = .002;
    for (let k = -6000; k <= 6000; k++) {
      const d = k * h;
      const density = Math.exp(-d * d / 4 - history.reduce((sum, o) => sum + M.likelihood(d, o).loss, 0));
      total += density; positive += density * (k > 0 ? 1 : k === 0 ? .5 : 0);
    }
    const estimate = M.expectedPercentiles(M.fit(2, history))[0] / 100;
    close(estimate, positive / total, .035);
  }
});

test('joint intervals preserve covariance and genuine certainty', () => {
  const p = { mean: [0, 1], cov: [[1, .999999], [.999999, 1]] };
  const stats = M.percentiles(p, 1);
  close(stats[0].mean, 0); close(stats[1].mean, 100);
  close(stats[1].low, 100); close(stats[1].high, 100);
  const tied = M.fit(3, [observation(0, 'continuous')]);
  tied.mean.forEach(x => close(x, 0));
  assert(tied.cov[0][0] < 1 && tied.cov[0][1] > 0);
  close(tied.cov[2][2], 1);
});

test('uncertainty smoke test under simulated model assumptions', t => {
  const random = M.rng(785), n = 5;
  let covered = 0, total = 0;
  for (let trial = 0; trial < 120; trial++) {
    const truth = Array.from({ length: n }, () => M.normal(random)), history = [];
    for (let k = 0; k < 60; k++) {
      const a = Math.floor(random() * n), b = (a + 1 + Math.floor(random() * (n - 1))) % n;
      history.push(observation(Number(random() < 1 / (1 + Math.exp(truth[b] - truth[a]))), 'binary', a, b));
    }
    const stats = M.percentiles(M.fit(n, history), trial + 10);
    for (let i = 0; i < n; i++) {
      const rank = 100 * truth.filter(x => x < truth[i]).length / (n - 1);
      covered += Number(rank >= stats[i].low && rank <= stats[i].high); total++;
    }
  }
  t.diagnostic(`${covered}/${total} item intervals contained their simulated true rank; smoke check, not empirical user calibration.`);
  assert(covered / total > .88);
});

test('mode-specific information is finite, symmetric and sensitive to variance', () => {
  for (const mode of ['binary', 'continuous']) {
    for (const mean of [0, 1, 5, 20]) {
      assert(Number.isFinite(M.information(mean, 1, mode)));
      close(M.information(mean, 1, mode), M.information(-mean, 1, mode));
    }
    assert(M.information(0, 2, mode) > M.information(0, .01, mode));
    close(M.information(0, 0, mode), 0);
  }
});

test('bootstrap connects the graph, skips avoid repeats, and two items work', () => {
  const history = []; let p = M.prior(8), pair = M.select(p, history, 'binary', 1);
  for (let i = 0; i < 7; i++) {
    history.push(observation(1, 'binary', ...pair)); p = M.fit(8, history);
    const next = M.select(p, history, 'binary', i + 2, pair);
    assert.notEqual(pair.slice().sort().join(), next.slice().sort().join()); pair = next;
  }
  const e = M.evidence(8, history);
  assert(e.counts.every(x => x > 0)); assert.equal(new Set(e.components).size, 1);
  assert.equal(M.select(M.prior(2), [], 'binary', 1, [0, 1]).length, 2);
});

test('validation rejects malformed names, indices, settings and likelihood values', () => {
  for (const text of ['one', 'A\na', 'Ａ\nA', 'a\n' + 'x'.repeat(201)]) assert.throws(() => S.parse(text));
  const state = S.create(S.parse('A\nB\nC'));
  for (const mutate of [x => x.version = 2, x => x.items[0].label = '', x => x.seed = -1, x => x.pair = [1, 1], x => x.observations = [observation(.5)], x => x.observations = [observation(1.1, 'continuous')]]) {
    const candidate = JSON.parse(JSON.stringify(state)); mutate(candidate); assert.throws(() => S.validate(candidate));
  }
  assert.equal(JSON.stringify(S.validate(JSON.parse(JSON.stringify(state)))), JSON.stringify(state));
});

test('imported disconnected graphs are explicitly bridged before exploitation', () => {
  const observations = [observation(1, 'binary', 0, 1), observation(1, 'binary', 2, 3)];
  const p = M.fit(4, observations), components = M.evidence(4, observations).components;
  for (let seed = 1; seed <= 25; seed++) {
    const pair = M.select(p, observations, 'continuous', seed);
    assert.notEqual(components[pair[0]], components[pair[1]]);
  }
  const state = S.create(S.parse('A\nB\nC\nD'));
  state.observations = observations;
  assert.equal(M.analyze(state, false).components, 2);
});

test('UI and CSV share ranks, unseen items, and safe text handling', () => {
  const state = S.create(S.parse('=1+1\nQuoted, "name"\nUnknown'));
  state.observations = [observation(0, 'continuous')];
  const d = M.analyze(state, false), rows = S.order(state, d), csv = S.csv(state, d);
  assert.equal(rows[0].rank, 1); assert.equal(rows[1].rank, 1); assert.equal(rows[2].rank, null);
  assert(csv.includes('"\'=1+1"')); assert(csv.includes('"Quoted, ""name"""'));
  assert(csv.includes('"","Unknown","","","","0","Not yet compared"'));
});

test('10,000 contradictory mixed judgments stay finite and positive definite', t => {
  const random = M.rng(99), observations = [];
  for (let k = 0; k < 10000; k++) {
    const a = Math.floor(random() * 50), b = (a + 1 + Math.floor(random() * 49)) % 50;
    observations.push(observation(k % 2 ? Number(random() < .6) : random() * 2 - 1, k % 2 ? 'binary' : 'continuous', a, b));
  }
  const start = performance.now(), p = M.fit(50, observations);
  M.cholesky(p.cov); assert(p.mean.every(Number.isFinite));
  for (let i = 0; i < 50; i++) close(p.cov[i].reduce((a, b) => a + b, 0), 1);
  t.diagnostic(`Full 50-item posterior refit: ${Math.round(performance.now() - start)} ms.`);
});
