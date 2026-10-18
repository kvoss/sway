# Sway — Find your order

Sway helps you discover your preferences by choosing between two things at a time. Bring a list of ideas, places, priorities, or other possibilities; watch your preference map take shape with each choice.

**[Open Sway](index.html)** in your browser. The complete app is one HTML file. It works offline and needs no account, installation, or build step.

## Your first ranking

1. Enter **2–50 unique names**, one per line, or select **Try an example**.
2. Select **Find my order**.
3. In **Quick pick**, choose the card you prefer. To express strength, switch to **Fine tune**, move the slider, and select **Record preference**.
4. Select **See my order** whenever you want to pause. **Keep refining** returns to comparisons.
5. Download a **JSON backup** before closing if you want a portable copy of your progress.

Use **Equal preference** when both options appeal equally, **Skip** when you cannot judge, and **Undo** to remove your latest recorded choice. Skipping supplies no preference evidence.

## Reading your map

Higher scores indicate a higher expected position **within your own list**. In an exact order of five items, the positions would be 0, 25, 50, 75, and 100. Sway averages over plausible orders, so scores can fall between those values.

The dot shows the expected position. The band shows an **approximate 95% model interval**: a wide band means the order is still uncertain. Bands can stay wide around equally preferred items, even after many comparisons. There is no required number of choices or guaranteed finish point.

Uncompared items appear below compared items with a dash. Select **Show all items** when your map is showing only its first five entries.

## Keep your progress

Sway attempts to save one active session in this browser. Look for **Saved on this device**. Browser storage can be unavailable or cleared; a JSON backup is your portable recovery copy.

| File | Use it for |
| --- | --- |
| `sway-backup.json` | Restore names, judgments, current pair, and settings in Sway. |
| `sway-order.csv` | View or share the current ranking in a spreadsheet. It cannot restore a session. |

If another tab changes the saved session, Sway keeps this tab's work in memory and pauses its autosave. **Download a backup before reloading or closing that tab.** Reloading adopts the saved version and discards any unsaved in-memory changes.

The app makes no automatic network requests. Its optional research link opens an external website when selected. Backup and CSV files contain your entered names; JSON also contains your judgments.

## Find the right guide

- **[User guide](docs/USER_GUIDE.md):** controls, examples, keyboard use, backups, and troubleshooting.
- **[Model explained](docs/MODEL.md):** likelihoods, percentile calculations, pairing, assumptions, and limits.
- **[Contributor guide](CONTRIBUTING.md):** source layout, reproducible checks, file formats, and change review.
- **[Review record](REVIEW.md):** findings, corrections, self-assessment scores, and the scope of recorded verification.

Recorded browser checks cover Chromium and Firefox on desktop Linux, including mobile-sized viewports. Safari, phone hardware, and manual screen-reader use remain unverified. The preference model has not been calibrated with human participants.
