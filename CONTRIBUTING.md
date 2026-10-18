# Contributing to Sway

[Project overview](README.md) · [Model explanation](docs/MODEL.md) · [Review record](REVIEW.md)

Jump to [running checks](#run-checks), [the session format](#preserve-the-session-format), or [reporting an issue](#report-an-issue).

## Keep the deliverable portable

`index.html` contains all runtime HTML, CSS, application JavaScript, and worker code. Opening this file directly must remain sufficient to use Sway. The documentation and test harnesses are development resources; they are not required alongside a distributed copy of the HTML file.

There is no application package manifest, build process, backend, or configured lint command. Browser-test dependencies are optional tools and do not become application dependencies.

| Location | Responsibility |
| --- | --- |
| `index.html`: markup and `<style>` | Interface, accessibility semantics, responsive layout, and motion. |
| `index.html`: `engine-source` script | Pure likelihood, posterior, percentile, and pairing functions; worker message handling. |
| `index.html`: application script | Session validation, persistence, import/export, rendering, and interactions. |
| `tests/model.test.cjs` | Numerical invariants, reference checks, validation, and export regressions. |
| `tests/browser.cjs` | Interaction, recovery, concurrency, downloads, and responsive browser checks. |
| `tests/accessibility.cjs` | Selected WCAG 2.0/2.1 tagged and axe best-practice checks. |

Use clear names and readable formatting. Preserve the separation between model functions and DOM logic. Use native editing tools; do not alter source files through Python, Bash, or sed scripts. Follow the parent repository's `AGENTS.md` instructions.

## Run checks

Run these commands **from the `sway/` directory**. A Node.js installation is required for tests. The recorded review used Node.js 26.8.1; these instructions do not establish support for every Node release.

### Numerical and session checks

```sh
node tests/model.test.cjs
```

This uses only Node built-ins, exits nonzero on failure, and extracts the actual embedded model and session helpers from `index.html`. Keep the pure helpers before the application bootstrap so the harness can load them without a browser. Its extraction recognizes the existing script identifiers and structure; update the harness if those boundaries change.

### Browser and accessibility checks

Install the tool versions used by the review in this directory, then download their matching browser builds:

```sh
npm install --prefix . --no-save --package-lock=false playwright@1.57.0 @axe-core/playwright@4.10.2
npx --no-install playwright install chromium firefox
```

The install creates local development dependencies under `node_modules/`. It does not change the standalone app's runtime requirements. Direct tool versions are pinned here, but there is no lockfile for their complete dependency tree; record resolved versions when publishing new results. Browser downloads require network access; Linux hosts may also need browser system libraries. Read installation errors before retrying; do not disable browser security to work around an environment failure.

```sh
node tests/browser.cjs
SWAY_BROWSER=firefox node tests/browser.cjs
node tests/accessibility.cjs
```

The environment-variable syntax above is for POSIX shells. In PowerShell, set `$env:SWAY_BROWSER = 'firefox'`, run `node tests/browser.cjs`, then remove it with `Remove-Item Env:SWAY_BROWSER` before other browser runs.

| Variable | Purpose |
| --- | --- |
| `SWAY_BROWSER` | `chromium` by default; use `firefox` for the second recorded browser suite. |
| `SWAY_PLAYWRIGHT_MODULE` | Absolute path to an existing Playwright package if it is not installed locally. |
| `SWAY_AXE_MODULE` | Absolute path to an existing `@axe-core/playwright` package. |
| `SWAY_CHROMIUM_PATH` | Override the Chromium executable. Applies to browser and accessibility harnesses. |
| `SWAY_FIREFOX_PATH` | Override the Firefox executable for the browser harness. Use a Playwright-compatible build. |

For example, with a suitable system Chromium on Linux:

```sh
SWAY_CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs
SWAY_CHROMIUM_PATH=/usr/bin/chromium node tests/accessibility.cjs
```

The browser harness opens the file directly, uses an isolated context, and exits nonzero on failure. It saves screenshots to a new OS temporary directory and prints that directory after a successful run. The accessibility harness always uses Chromium and prints any detected violations before failing. Screenshots and console reports are not automatically stored in the project; save them explicitly when needed for review.

The concurrency regression expects Web Locks to be available. A browser without that API can exercise the app's fallback behavior but will not pass that particular check. A missing executable, module-resolution error, or missing library is an environment failure, not a successful verification run.

## Preserve the session format

JSON backups and the browser's `sway.session.v1` key share a version 1 session structure:

| Field | Meaning |
| --- | --- |
| `version` | Integer `1`. Unknown versions are rejected. |
| `id` | Nonempty session identifier, at most 100 JavaScript string code units. |
| `seed` | Integer from 0 through 4,294,967,295, used for repeatable sampling and pairing. |
| `cursor` | Nonnegative safe integer, at most 1,000,000,000; advances on choices, skips, and undo. |
| `items` | 2–50 objects containing unique nonempty `id` values and unique, trimmed `label` values without CR or LF characters. |
| `observations` | At most 10,000 recorded judgments, with item indices `a`, `b`, a `kind`, and a `value`. |
| `mode` | `binary` or `continuous`. |
| `pair` | Two distinct valid indices for the current displayed comparison. |
| `finished` | Boolean indicating whether the results view is selected. |

Item labels are limited to 200 JavaScript string code units. Duplicate detection normalizes with NFKC and lowercases labels. Item identifiers have a 100-code-unit limit. Stored indices refer to the order of the `items` array; changing that order without remapping judgments changes their meaning.

Binary judgments have `value` 1 for `a` or 0 for `b`. Continuous judgments accept finite values in `[-1, 1]`, positive toward `a`; explicit ties have value 0. The backup does not store a fitted posterior. The engine recomputes derived values after validation, which lets older Sway version 1 backups benefit from corrected inference.

For integrations, this is a minimal version 1 session with two items and no judgments:

```json
{
  "version": 1,
  "id": "example-session",
  "seed": 123,
  "cursor": 0,
  "items": [
    { "id": "coffee", "label": "Coffee" },
    { "id": "tea", "label": "Tea" }
  ],
  "observations": [],
  "mode": "binary",
  "pair": [0, 1],
  "finished": false
}
```

File imports are limited to 2 MiB and replace a session after confirmation. Invalid imports must leave the current session untouched. Do not silently reinterpret an old schema if a future change needs a migration.

CSV is a summary, not a backup. Its seven columns are `Order`, `Item`, `Expected percentile`, `Lower 95%`, `Upper 95%`, `Comparisons`, and `Evidence`. Uncompared rows leave the order and three estimate fields empty. The export uses UTF-8 with a BOM, CRLF row endings, quoted cells, and protection for spreadsheet formula prefixes.

## Review a change

- Check model changes for normalization, sign conventions, chronology and presentation invariance, covariance, sparse graphs, ties, and the documented approximations. Preserve failed-update atomicity and undo behavior.
- Check interaction changes in both input modes, at narrow widths, with keyboard focus and reduced motion. Inspect populated maps, long names, loading, and errors; the accessibility harness covers only selected first-use states.
- Check persistence changes against backup compatibility, quota failures, cross-tab changes, and simultaneous writes. Keep a clear saved/in-memory status.
- Update the relevant user, model, or contributor guide when behavior changes. Verification numbers in `REVIEW.md` are a dated historical record; record a new scope and result rather than implying old runs cover new behavior.

The parent directory has no Git metadata or established commit convention in the reviewed workspace. If contributing through Git, use a focused imperative subject such as `Clarify percentile interval guidance`. A change description should explain the behavior, motivation, checks performed, and remaining limits; include screenshots for visible changes.

## Report an issue

Include browser and operating system versions, whether the file was opened directly, reproduction steps, expected and observed behavior, and any visible error message. A small invented list is preferable to sharing personal judgments. Attach a JSON backup only if you are comfortable sharing every name and recorded choice it contains.
