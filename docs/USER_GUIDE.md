# Using Sway

[Open the app](../index.html) · [Project overview](../README.md) · [Model details](MODEL.md)

Jump to [controls](#choose-how-to-respond), [the map](#understand-the-preference-map), [backups](#save-and-restore-safely), [keyboard use](#keyboard-and-accessibility), or [troubleshooting](#when-something-goes-wrong).

## Start with one clear question

Choose items you can compare under the same question: “Which weekend plan would I prefer?” or “Which project should I prioritize?” The question is for your own consistency; Sway currently has no separate question field.

Enter one name per line:

```text
A weekend by the sea
A cabin in the mountains
A long lunch with friends
An afternoon with a good book
```

Sway accepts 2–50 items and up to 200 characters per name. It trims spaces around names and ignores blank lines. Names must be unique; capitalization and certain equivalent Unicode forms do not make a duplicate into a new item. The × button on a preview chip removes that item before you start.

Select **Find my order** to begin. Items in an active session cannot be added or renamed in place. **New list** opens an editor prefilled with your current names; submitting it creates a fresh session after confirmation. **Back to my session** cancels that edit. Save a backup first if you want to retain the old session.

## Choose how to respond

| Control | What it does |
| --- | --- |
| **Quick pick** | Selecting either card immediately records a preference for it. |
| **Fine tune** | Move toward the item you prefer. Select **Record preference** to submit the strength you previewed. |
| A card in **Fine tune** | Sets the slider to its strongest preference for that item. You still need to submit. |
| **Equal preference** / **Equal** | Immediately records indifference between the two items. |
| **Skip this pair** / **Skip** | Requests another pair when alternatives exist. Adds no evidence. |
| **Undo** | Removes the most recent recorded judgment and restores its comparison. Your current input mode stays selected. |

The centered slider starts unsubmitted. Moving it previews your response; changing modes, skipping, or leaving comparisons does not record that preview. To explicitly submit a tie, use **Equal preference**, or adjust the slider back to the center and submit it.

Wait for each update before making another choice. Sway briefly guards against repeated clicks and held keys. Check **Last recorded** to see what was accepted, or expand **Your recent choices** for the latest 20 judgments. JSON backups contain the complete recorded history.

With only two items, skipping cannot provide a different unordered pair. Pairs may reappear later: repeated comparisons can refine the model.

## Understand the preference map

### Scores describe a position in this list

Higher expected percentiles mean higher expected preference. If five items had an exact order, their percentiles would be:

| Position, from least to most preferred | Percentile |
| --- | ---: |
| First | 0 |
| Second | 25 |
| Third | 50 |
| Fourth | 75 |
| Fifth | 100 |

Sway considers many plausible orders. An item that sometimes occupies the middle position and sometimes the position above it can have an expected percentile between 50 and 75. Scores refer to your complete current list, including the model's uncertainty about uncompared items. They cannot be compared directly across different lists.

**A score of 80 is a relative position estimate.** It is not an 80% confidence level, an 80/100 quality rating, or an 80% probability of being your favorite.

The small order numbers describe the displayed order among compared items. Scores shown equal to one decimal place share a number, such as **01, 01, 03**. Their original input order breaks display ties. Shared numbers do not prove that the underlying preferences are identical.

### Bands show how much the order could vary

The horizontal band is an approximate 95% credible interval for percentile position under the model. A score of 60 with a band of 0–100 means that the model still allows a very broad range of positions; the point estimate alone would hide that uncertainty.

Overlapping bands leave room for a different ordering. A wide band can also persist when items are nearly equal: even small changes can swap their rank. With only two items, each sampled position is either 0 or 100, so a wide interval is common.

An explicit tie is useful evidence. It can bring estimated utilities closer together while leaving the relative order unresolved. Intervals may widen after contradictory choices; every choice is not guaranteed to narrow every band.

Uncompared items have a dash and appear below compared items. Sway avoids presenting their prior-based estimates as established scores. The compact map shows five entries; use **Show all items** to see the rest. Expanding an item's details gives its numeric interval.

### Coverage is a different measure

**Items explored** counts how many items have appeared in a recorded judgment. Reaching full coverage means all items have some direct evidence. It does not mean their ranking is certain. The map also reports a typical interval width for compared items, which may stay large around ties.

If an imported session has separate comparison groups, Sway explains that their relative positions currently depend on the prior and chooses comparisons that connect the groups.

## Pause, resume, or finish

Select **See my order** whenever the current perspective is useful. **Keep refining** resumes comparisons. You can also return to the same file in the same browser profile and resume if its saved session is available.

There is no automatic declaration of convergence. A practical stopping point is when the distinctions you care about are useful enough for your decision. Sessions accept at most **10,000 recorded judgments**. At that limit, export your results or undo the latest judgment to continue; an additional judgment takes the session back to the limit.

## Save and restore safely

### JSON: a restorable session

1. Select **Save backup** or **Save JSON backup**.
2. Keep the downloaded `sway-backup.json` somewhere you can find again. Your browser may add a number to repeated downloads.
3. To restore it, select **Restore a backup** or **Restore**, depending on the current screen.
4. Choose the JSON file. If a session is open, confirm that you want to replace it.

Restore replaces the current session; it does not merge histories. Invalid files leave the current session intact. The maximum file size is **2 MiB (2,097,152 bytes)**. CSV files and backups from the separate Between app are not Sway backups.

Sway version 1 backups remain supported. Scores are recalculated from judgments using the current engine, so older backups can show corrected estimates after restoration.

### CSV: a snapshot for a spreadsheet

**Export CSV** or **Export my order** downloads `sway-order.csv`. It contains order, name, expected percentile, interval bounds, comparison count, and evidence status. Uncompared items have blank order and score fields.

CSV preserves the displayed order but cannot be imported to resume comparisons. Spreadsheet-sensitive names may receive a protective leading apostrophe in the CSV; the JSON backup retains their original text.

### Autosave and privacy

**Saved on this device** means the latest save attempt succeeded. Private browsing, browser settings, cleared site data, a different profile, or a changed file location can affect availability. Download a JSON backup before moving the app file or switching devices.

The app computes locally and makes no automatic network requests. Selecting the research link opens an external website. Downloaded files are readable: anyone you share a backup with can inspect its names and judgments. Browser storage and downloaded backups are not encrypted by Sway.

## Keyboard and accessibility

Use Tab and Shift+Tab to move through controls, and Enter or Space to activate buttons. Comparison shortcuts work only while focus is inside the comparison stage:

| Key | Action |
| --- | --- |
| ← / → in **Quick pick** | Record a preference for the corresponding card. |
| E | Record equal preference. |
| S | Skip the current pair. |
| Z | Undo the latest recorded judgment. |
| Arrow keys on the **Fine tune** slider | Adjust the preview using the browser's native slider controls. |
| Enter on the adjusted slider | Record the preview. |

E, S, and Z apply to comparison buttons; they do not override the focused slider. Shortcuts do not apply while typing in the list editor. Held submission keys are guarded against repeated judgments. Reduced-motion preferences are respected. Numeric interval details and labels convey information without relying on color alone. Automated accessibility checks have passed for selected screens; manual screen-reader validation remains outstanding.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| A duplicate-name or length error | Edit the list. Give each item a distinct name of at most 200 characters. |
| **Autosave is unavailable** | Keep working if you wish, then download a JSON backup before closing. Unsaved work remains only in this open page. |
| **Another tab changed the saved session** | Download a backup of this tab first. Reload only when you are ready to discard its unsaved work and adopt the saved version. |
| A saved session cannot be restored | Restore a JSON backup, or start a fresh list. Browser storage is not a substitute for a backup. |
| A model update fails and **Retry** appears | The previous accepted session remains intact. Retry the update; if it keeps failing, back up any open session and describe what triggered the error. |
| The calculation engine cannot start | Try a browser configuration that permits JavaScript and Web Workers. Storage-only failures allow in-memory use; a blocked worker prevents inference. |
| **Your session changed while opening this file** | Wait for the current update, then select the backup again. |

For bug reports, see the [contributor guide](../CONTRIBUTING.md). If uncertainty remains broad, the [model explanation](MODEL.md) can help distinguish a limitation of rank estimation from an application error.
