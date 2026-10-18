# Sway — Find your order

Open `index.html` in a browser. It is the complete deliverable: styles, application, and numerical worker are embedded, and no network or build step is required. Supporting documents and tests are development resources.

## Use

Paste 2–50 unique names, one per line. Quick pick records a binary preference. Fine tune previews a continuous preference, then records it on explicit submission; Equal records an explicit tie. Skip supplies no evidence. Undo removes the latest judgment.

The map shows expected percentile positions within the whole list, with approximate 95% credible intervals. Uncompared items are listed separately without a numeric estimate. Equal displayed scores share an order number in the interface and CSV. Scores are relative positions, not quality ratings or win probabilities.

The browser saves one session locally. JSON backups preserve all judgments and settings; CSV exports summarize the current map. Autosave uses an exclusive Web Lock where available and checks for changes from other tabs. A conflict suspends autosave in this tab to preserve both versions. Download a backup or reload to adopt the saved version. Browsers without Web Locks retain change detection but cannot guarantee atomic cross-tab writes.

## Statistical model

- Standard normal utility priors; fixed link precision of 1.
- Binary Bradley–Terry likelihood and a normalized continuous Bernoulli likelihood for strength judgments.
- Full-history MAP refitting after every choice, using pair sufficient statistics, damped Newton optimization, and inverse-Hessian Gaussian covariance. This removes the earlier sequential approximation's chronology bias.
- Expected percentiles calculated from Gaussian pairwise probabilities. Approximate credible intervals use 1,000 deterministic, antithetic joint samples with a fixed session seed.
- Connected graph bootstrap, followed by mode-specific numerical mutual information with 10% exploration. Disconnected imported histories are bridged explicitly.

The Gaussian posterior remains an approximation. The model assumes stable, transitive preferences and conditionally independent judgments. A user's repeated choices can violate these assumptions; interval coverage and the continuous response scale have not been calibrated on human participants. The synthetic coverage check is a regression smoke test, not evidence of psychological validity. See [REVIEW.md](REVIEW.md) for findings and limitations.

Version 1 backups remain compatible. Their scores are recomputed from the original judgments using the corrected inference engine.

## Verification

Run the dependency-free numerical and validation tests from this directory:

```sh
node tests/model.test.cjs
```

Optional development tools for browser and accessibility tests:

```sh
npm install --no-save --package-lock=false playwright@1.57.0 @axe-core/playwright@4.10.2
npx playwright install chromium firefox
node tests/browser.cjs
SWAY_BROWSER=firefox node tests/browser.cjs
node tests/accessibility.cjs
```

The harness also accepts `SWAY_PLAYWRIGHT_MODULE`, `SWAY_AXE_MODULE`, `SWAY_CHROMIUM_PATH`, and `SWAY_FIREFOX_PATH` for existing tool installations. Browser tests use isolated profiles, save screenshots to a temporary directory, and leave user sessions untouched.

Keep the deliverable self-contained. Apply changes using native editing tools. The three embedded sections are styling/markup, pure statistical worker functions, and session/rendering logic. Regression tests extract the actual embedded code rather than maintaining a second implementation.
