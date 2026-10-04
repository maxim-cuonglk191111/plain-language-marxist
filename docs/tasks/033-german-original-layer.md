# Task 033 — Optional German original layer, switched on in Settings

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Low |
| **Milestone** | M3 (SDD §16 plans a "source comparison view" there); can start once 031 B lands |
| **Depends on** | 023 (layers), 031 B/F (settings, telling layers apart) |
| **Related** | 032 (study Bible app model: the original-language view in Blue Letter Bible) |

## Goal
Let readers who want it read the Manifesto next to the **German text Marx and Engels wrote**, as a fourth layer.
- It is **off by default** for everyone. Readers turn it on in **Settings** ("Extra layers: German original").
- Once turned on, a fourth toggle, **German**, appears in the layer switch, and works like the other three.
- Readers who never turn it on see no change.

Maintainer decision, 2026-10-04 (task 032, "Decisions").

## What the source looks like (checked 2026-10-04)
`pnpm plm parse-check https://www.marxists.org/deutsch/archiv/marx-engels/1848/manifest/1-bourprol.htm --via wayback`:
- **Parses cleanly.** 104 blocks (4 headings, 100 paragraphs), 0 errors, 0.2% of words not kept (the breadcrumb and the "last updated" line).
- **It is not the 1848 first edition.** It is a later edition's text, with numbered notes giving the readings of the other editions. For example: "27. 1848, 1872, 1883: Pfandverleiher", "29. 1888 eingefügt: (Trade-Unions)". Inline markers such as `[3]` link the text to those notes.
- Chapter pages: `1-bourprol.htm` was checked; the others are listed on `…/1848/manifest/index.htm`. Run `parse-check` on each, and read every "Not kept" line (docs/architecture/parser-guide.md).

## Rights (maintainer must verify before import)
- **The German text** by Marx (d. 1883) and Engels (d. 1895) is public domain everywhere.
- **The variant notes are editorial work.** Find out who made them, possibly the MEW edition (Dietz Verlag), and whether they may be republished. Until that is verified:
  - import the text only;
  - keep the inline markers out of the layer (the parser lists them as dropped);
  - record the decision in `work.yml` rights notes, as was done for the English text.
- **Label it honestly:** "German original (edition of <year>)", not "1848", unless a first-edition text is used.

## Parts

### A — Import (new kind of source page)
1. Follow docs/architecture/parser-guide.md for the MIA German pages. Add parser fixtures and golden files, and bump `MiaAdapter.version` if the adapter changes.
2. **Store it as a second, immutable source** for the same document, written only by `plm import` (never by hand, SDD §17 rule 1). Proposed layout: `ch01/source.de.yml`, next to `source.yml`. This is a **persisted shape**: the schema change, `schema_version` bump and `plm migrate` step go in the same commit.
3. **`work.yml`** records the German edition, its source URL and its rights, verified by the maintainer.

### B — Alignment with the English passages
German paragraphs do not map one-to-one onto Moore's English paragraphs. The 1888 translation sometimes splits or joins them.
1. Add an alignment file, e.g. `ch01/align.de.yml`. It groups English passage IDs with German passage IDs (`[p00017] ↔ [d00015, d00016]`), in order, with every passage in exactly one group. This is a persisted shape with a validator: groups are monotonic and nothing is left out.
2. **`plm align-draft <document-dir> de`** proposes groups from headings, footnote anchors and length ratios. A person checks every group before it is committed, the same way renderings are reviewed.
3. **Reader rows** (023) become the smallest groups where the English rendering boundaries and the German alignment boundaries both fall, so all four layers line up.

### C — Data contract
- Add the German text and the alignment to `DataDocument` as **optional** fields, e.g. `editions: { de: { attribution, url, passages, align } }`. This is backward-compatible, like task 022's `example`, so `/data/v1` stays v1.
- `search.json` labels layers with the enum `o/p/e/v`. Adding German search would change that public enum, so German search is **left out of this task**. If it is wanted later, it gets its own file or a contract decision.

### D — Reader
1. **Setting:** "Extra layers: German original — Off / On" in Reading settings. It is stored as a new prefs field, read with a default of off, so older saved prefs still load. It is applied before first paint by `BOOT_SCRIPT`.
2. **Layer switch:** a fourth button, **German**, only when the setting is on. The layer is remembered like the others. Turning the setting off also turns the layer off. Old `?layers=` links keep working, and `?layers=…,german` works only when the setting is on.
3. **Without JavaScript** the German layer stays hidden. It is opt-in, and the no-JS page already shows three layers. Record this in SDD §12.
4. **Layout.**
   - With four layers on a wide screen: a 2 × 2 grid, Plain English | Original on top and German | Context below.
   - With three layers including German: German sits next to the Original.
   - Stacked on phones the order is Plain English, Original, German, Context, each labelled, with the Part F distinction for source text.
5. **Labels.**
   - Cells are `lang="de"` (for screen readers, hyphenation and browser translation).
   - The German layer label is "German original".
   - While German is shown, the Original's label reads "Original (English translation, 1888)", so nobody takes Moore's text for Marx's own words.
6. **Page weight.** German text adds roughly 15 KB gzipped to each chapter's HTML even when off. That is accepted, because it keeps the page static. Measure and record it.

## Out of scope (for now)
- German term marks and term cards (vocabulary is English).
- German search (see C).
- Read-aloud in German (031 E can add a German voice later; the layer choice is already per reading).
- Other languages and other works. This task covers the German Manifesto only. If it works well, a later task can generalise it.

## Docs and tests
- **SDD §12 Layers row:** "a fourth, optional German layer, off by default (task 033, maintainer decision)". Record in the same PR why the design changes: the maintainer asked for it.
- **e2e:**
  - setting off: no German button and no German text visible;
  - setting on: toggle, layout with 2, 3 and 4 layers, `lang="de"`, labels;
  - deep links still land;
  - axe in every theme;
  - no-JS page unchanged.
- **Unit tests:** the alignment validator, `align-draft` on the fixture, and the prefs migration.
- Import fixtures and golden files for the German parser path.

## Acceptance
- A reader who never opens Settings sees exactly what they see today.
- With the setting on, German lines up with the English row by row in all four Manifesto chapters, with `lang="de"` and clear labels.
- The rights of the German text and of any notes are verified and recorded in `work.yml` before anything is published.
- `pnpm check` and `pnpm e2e` pass. SDD §12 is updated.

## Done
_(fill in per part as it lands)_
