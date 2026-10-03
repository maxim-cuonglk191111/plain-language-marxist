# Task 023 — Reader with three switchable layers: Plain English | Original | Explanation

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 014, 016 |
| **Related** | 022 (explanation content) |

## Goal
Show the three layers as separate, switchable columns: **Plain English | Original | Explanation**. The reader turns each layer on or off, and **at least one layer is always shown**.

- **Desktop:** the layers that are on sit side by side as columns. With one layer on, it is a single reading column. With two or three, the passages line up row by row.
- **Mobile:** the layers that are on stack as rows within each passage, in the same order: Plain English, then Original, then Explanation.
- **Toggles** live in a sticky bar, so a layer can be turned on or off from anywhere in the text.

This is the maintainer's request (2026-10-04). It replaces the current three-way mode switch (Plain English / Original / Parallel).

## Scope

### Layer toggles
- Three toggle buttons (`aria-pressed`) in a labelled group.
- When only one layer is on, its toggle cannot be turned off. It shows as disabled with an accessible reason, such as "At least one layer stays visible".
- Default: Plain English only, which is the current default view.
- Remembered per reader (localStorage) and readable from the URL. Keep the old `?view=` links working:

  | Old link | Layers shown |
  |---|---|
  | `?view=plain` | Plain English |
  | `?view=original` | Original |
  | `?view=parallel` | Plain English and Original |

  A new parameter, such as `?layers=plain,original,explain`, is client state only. The canonical URL stays the bare path (SDD §10.1).
- **Without JavaScript,** all layers are shown and there are no toggles. This matches today's no-JS behaviour, which shows both layers.

### Explanation column
- **Contains** the passage's explanations: translation notes, historical context and so on, labelled by kind as now. They move out of the current `<details>` under the Original.
- **Later:** short term definitions for the terms marked in that passage, once task 022 lands, so a reader can follow the vocabulary without opening cards.
- **Empty rows:** when a passage has no explanation, the cell stays empty and compact. It must not leave big gaps; consider showing only a small marker.

### Layout rules
- **Line length:** keep every column readable, at least about 40 characters per line.
- **Wide screens:** three columns from roughly 1200px up.
- **Below that,** decide while building and record the decision here. Options: (a) at most two columns, with the third layer as a row under them; or (b) switch to the mobile row layout.
- **Rows line up** across columns (same passage, same row), as Parallel mode does today, including multi-passage renderings.
- **Deep links** (`#p00017`) still scroll to and highlight the row in every combination. The sticky toggle bar must not cover the target (`scroll-margin`).
- **Reader settings** (text size, line spacing, theme, term marking) keep working in every combination.

### Docs and tests
- **SDD §10.1** describes the view modes. Update it in the same PR and say why: the maintainer changed the reader design. SDD changes are allowed only when the design actually changes.
- **e2e tests:**
  - turning layers on and off;
  - the last layer cannot be turned off;
  - old `?view=` links;
  - deep links with one, two and three layers;
  - the mobile row layout;
  - no-JS;
  - axe on every combination that has a different layout.

## Acceptance
- Every combination of one, two or three layers works on desktop and mobile, and there is never a state with no layer shown.
- Old `?view=` links open in the matching layout.
- The reader still works without JavaScript, and axe reports no violations.
- `pnpm check` and `pnpm e2e` pass.
