# Task 031 — E-book reader experience: navigation, appearance, immersive reading, highlights, read-aloud

| | |
|---|---|
| **Status** | In progress |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 014, 016, 023 |
| **Related** | 024 (term card stack), 030 (four chapters to navigate). PWA/offline and EPUB remain M4 |

## Goal
Make the reader feel like a good **study reader** rather than a document page. The reference model is a study Bible app (YouVersion, BibleGateway, Blue Letter Bible): an old canonical text read next to modern versions, cited by passage, marked up, and listened to. E-book apps (Kindle, Apple Books) remain the model for typography and navigation. Web-novel apps are **not** the model (see "Direction" below). The reader should be able to:
- find their way around a work;
- shape the page to their eyes;
- read without distraction;
- mark and quote what matters;
- listen to a chapter being read aloud.

All of this keeps the platform's rules: static export, works without JavaScript, nothing leaves the browser, and the layers stay separate. This is the maintainer's request (2026-10-04).

## Direction (maintainer, 2026-10-04, after Part A)
The maintainer questioned whether a web-novel interface suits this project, and chose the study Bible app as the model instead. The reasons:
- Marxist classics are **studied**, not binged: short, dense texts that people reread, compare, quote and argue about.
- A Bible app solves the same problem: an old text and modern versions side by side, stable passage references, highlights and notes, "compare versions" on one passage, audio.
- Web-novel patterns work against the core feature. Paged mode can only show one layer, and an auto-hiding bar hides the layer switch.

What changed in this task:
- **Dropped:** paged mode, the auto-hiding reader bar and tap zones (old C2 and part of C1). See "Out of scope".
- **Changed:** C3 "peek" becomes **Compare this passage** (all layers of one passage). D starts from **passage actions** (tap a passage, act on all of it) before text-selection highlights.
- **New order:** A (done) → B + F → D → E → C.
- Bible-app features that are not in this task (passage references, concordance, reading plans, cross-references, quote images) are in [task 032](032-study-reader-features.md).

## What exists today (do not rebuild)
- **Three layer toggles** in a sticky bar (023).
- **Term cards,** nested up to 5 deep (015, 024).
- **Settings:** theme system/light/dark, four text sizes, two line spacings, term underlines (016).
- **"Continue where you left off"** link and per-passage bookmarks with a `/bookmarks/` page (016).
- **Search** labelled by layer (016).

**Missing today:**
- any chapter-to-chapter navigation;
- a table of contents;
- a progress indicator;
- a work landing page;
- control over fonts, width or margins;
- a distraction-free mode;
- highlights or notes;
- read-aloud.

## Constraints (apply to every part)
- **Static export and no-JS baseline.** Navigation (TOC, previous/next chapter) is server-rendered with plain `<a>` links (never `next/link`; see repo `CLAUDE.md`). Everything else is progressive enhancement and hidden without JS, the same way bookmark buttons are today.
- **Privacy.**
  - All state stays in `localStorage` under `plm:` keys. Every access goes through `readJson` / `writeJson`.
  - No accounts, no analytics, and no third-party requests.
  - Fonts are self-hosted, subset and loaded with `font-display: swap`. Google Fonts is not used.
- **Stored shapes are persisted shapes** (`../CLAUDE.md`).
  - New preference fields are read with defaults, so older saved prefs still load.
  - Annotations use a versioned key (`plm:annotations` = `{ v: 1, items: [...] }`) with a migration on read.
  - Existing `plm:bookmarks` entries keep working, either read in place or migrated once into annotations without loss.
- **No flash of wrong style.** New appearance prefs are applied before first paint by `BOOT_SCRIPT` (`lib/prefs.ts`), like the current ones.
- **Layer separation (SDD §12, §17).**
  - The Original and Plain English must stay visually distinct under every font and theme choice.
  - Anything copied or shared from the Plain English layer is labelled as a PLM plain-English rendering, not the original text.
- **Accessibility, WCAG 2.2 AA.**
  - Every feature is keyboard-operable.
  - `prefers-reduced-motion` turns off page-turn and auto-hide animations.
  - Single-key shortcuts can be switched off (SC 2.1.4).
  - Immersive mode always keeps a visible or focusable way back to the controls.
  - axe runs on each new surface.
- **Performance.** SDD §12 targets still hold: LCP < 2.5 s, interaction < 100 ms. Budget: the reader page's JS grows by at most **40 KB gzipped** for the whole task. Fonts are only fetched when chosen.
- **Hosting headers.** If a feature needs a header change (e.g. `Permissions-Policy`), change both `apps/web/public/_headers` and `apps/web/public/vercel.json`.

---

## Part A — Navigation and structure

1. **Work landing page**, at the work's folder path (e.g. `/archive/marx/works/1848/communist-manifesto/`). It shows:
   - title, authors, year, translator and source attribution;
   - a short description from `work.yml`, if present;
   - the chapter list with each chapter's reading time, and a "read" mark per chapter from local progress;
   - **Start reading** / **Continue reading** (JS) buttons.

   It must be pre-rendered.
2. **Table of contents drawer.**
   - Opened from a button in the reader bar, or with `t`.
   - Lists the work's chapters, with the current chapter expanded to its section headings (heading passages).
   - The current position is highlighted.
   - Without JS, the same TOC is a `<nav>` at the top of the chapter (or links to the landing page).
   - Focus is trapped while open; Escape closes it.
3. **Previous / next chapter.**
   - Server-rendered links in a chapter footer.
   - An **end-of-chapter card** shows "Chapter finished", the next chapter's title and opening line, and a large **Next chapter** button. The last chapter's card links back to the work page instead.
   - `<link rel="prev">` / `<link rel="next">` in the head.
4. **Progress.**
   - A thin progress bar under the reader bar, plus a label such as "Ch. II · 42% · about 9 min left".
   - Time left is estimated from the word count of the layers currently shown, at an adjustable reading speed (default 200 wpm; setting in Part B).
   - Word counts are computed at build time from the document data already in the page, so the `/data/v1` contract does not change.
5. **Continue reading shelf.** The home page shows (JS) the works and chapters with saved progress, most recent first, each with its progress and a resume link. Remove an entry with one click.
6. **Chapter finished marks.** A chapter is marked finished when the end-of-chapter card scrolls into view. The mark is shown in the TOC, work page and shelf, and the reader can clear it.
7. **Position and sharing.**
   - The bar shows "Passage 17 of 65".
   - **Copy link to passage** on each row writes `…/ch01.htm#p00017`.

## Part B — Appearance

Extend Reading settings, with a live preview at the top of the panel and **Reset to defaults**:

| Setting | Options |
|---|---|
| Theme | System, Light, **Sepia**, Dark, **Black (OLED)**. Contrast must meet AA in each; check term underlines, highlights and focus rings in all five |
| Font | Book serif (current), Sans (current), **Atkinson Hyperlegible** (self-hosted, OFL), and optionally OpenDyslexic. The choice applies to the Plain English layer; the Original keeps a distinct face, or the two are kept apart by the existing labels plus a style rule. Record the decision here |
| Text size | Continuous slider (e.g. 14–28 px in 1 px steps), replacing the four steps. Old `s/m/l/xl` values map to the nearest size |
| Line spacing | Compact, Normal, Relaxed, Loose |
| Line width | Narrow (~55ch), Medium (~66ch), Wide (~80ch). Single-column layouts only; multi-layer layouts keep the 023 column rules |
| Margins | Small, Medium, Large |
| Paragraph style | Spaced blocks (current), or indented first lines with no gap (book style) |
| Alignment | Left (default), or Justified with `hyphens: auto` (`lang="en"` is already set) |
| Reading speed | Words per minute for time estimates (150 / 200 / 250 / 300) |

## Part C — Focused reading

1. **Focus mode.**
   - Toggled with a button or `f`.
   - Hides the site header, the chapter header and the footer. The reader bar **stays** (it holds the layer switch, the project's core control), slimmed to one line.
   - A focusable "Exit focus mode" control stays in the bar.
2. _(Removed 2026-10-04: paged mode. See "Direction" and "Out of scope".)_
3. **Compare this passage** (like "compare versions" in a Bible app). From the passage actions (D1) or a long-press, a sheet shows that one passage in every layer, labelled: Plain English, Original, and any Context. The reader can check the source without switching layers. It closes on Escape or a click outside.
4. **Reading focus aids** (setting):
   - **Paragraph focus** dims every row except the one at the reading line.
   - **Reading ruler** is a horizontal band that follows the pointer or keyboard position.
   - Both are off by default.
5. **Keep screen on** (setting, off by default). Uses the Screen Wake Lock API where supported, released when the tab is hidden. Hidden where unsupported.
6. **Keyboard shortcuts**, with a `?` overlay that lists them:

   | Key | Action |
   |---|---|
   | `j` / `k` | Next / previous passage |
   | `[` / `]` | Previous / next chapter |
   | `t` | Table of contents |
   | `s` | Settings |
   | `f` | Focus mode |
   | `b` | Bookmark current passage |
   | `h` | Highlight selection |
   | `/` | Search |

   - Shortcuts are ignored while typing in an input.
   - A setting switches all single-key shortcuts off.

## Part D — Highlights, notes and quoting

1. **Passage actions first, then text highlights.**
   - **Passage level (build first).** Tap or click a passage (or press Enter on it), the way a Bible app opens a verse. A small menu offers: four highlight colours for the whole passage, **Note**, **Bookmark**, **Copy with source**, **Share**, **Compare** (C3) and **Listen from here** (E). It replaces the separate row buttons (bookmark, copy link) from Part A. Passage highlights need no text anchoring, so they cannot be orphaned.
   - **Text level (then).** Select text in the Original or Plain English layer, and a small toolbar offers the same colours, **Note**, **Copy with source** and **Share**.
   - Highlights render inline and can be opened to edit, recolour or delete.
   - Keyboard path: `h` highlights the current selection.
2. **Anchoring that survives revisions.** Each highlight is stored as:
   - document path, passage ID and layer;
   - a W3C-style text-quote selector (`exact`, `prefix` and `suffix`, about 32 characters each), plus character offsets as a hint.

   Plain English text changes between revisions, so on load the reader re-finds the quote. If the quote is not found, the highlight is kept and shown as **"Text changed — highlight could not be placed"** on the notes page. It is never dropped silently.
3. **Notes page** (`/notes/`, extending `/bookmarks/`).
   - Bookmarks, highlights and notes for all works, grouped by work and chapter.
   - Filter by colour or type.
   - Each item links back to its passage.
4. **Export / import.**
   - Export all annotations as **Markdown** (readable, with citations) and **JSON** (the versioned shape).
   - Import JSON merges by ID, so storage can be backed up or moved between browsers. This matters because `localStorage` can be cleared.
5. **Copy with source.** Copies the selected text, then a line that says where it comes from, so a quote pasted into a chat, essay or post can be traced. For example:

   > "The history of all hitherto existing society is the history of class struggles."
   > — Marx & Engels, *Manifesto of the Communist Party* (1848), Chapter I, trans. Samuel Moore (1888). Original text. https://…/ch01.htm#p00002

   - A quote from Plain English says **"Plain English version by Plain Language Marxist, not the original wording"**, so nobody mistakes our wording for Marx's.
   - Ordinary copy (Ctrl+C) is never changed; the source line is added only by this button.
6. **Share.** Uses the Web Share API where available, and otherwise copies the link.

## Part E — Read aloud

- **Engine.** Reads the chapter with the browser's built-in Web Speech API (`speechSynthesis`). There is no server and no added cost.
- **What it reads.** The reader chooses: **Plain English**, **Original**, or **Context** (explanations only), in the player. The first visible layer is selected to start with. Layers are never mixed in one reading.
- **Controls.** A small player in the reader bar:
  - play/pause;
  - previous/next passage;
  - speed 0.75–2×;
  - voice picker (from `getVoices()`, English voices first).
- **Follow along.** The passage being read is highlighted and kept in view; the current sentence is highlighted where the browser fires boundary events. Reading continues into the next chapter only if the reader chooses "Continue to next chapter".
- **Privacy note.** Some browsers send text to a cloud voice service. Mark voices with `localService === false` as "online voice" in the picker, and prefer local voices by default.
- **Unsupported browsers.** Where speech synthesis is missing, the player is hidden.

---

## Out of scope (and why)
- **Infinite scroll across chapters.** It breaks canonical URLs, deep links and screen-reader landmarks. The end-of-chapter card does the same job.
- **Streaks, badges, XP and reading-time leaderboards.** SDD §12 rules out gamification. Finished marks and progress are personal and stay local.
- **Paragraph comments** (web-novel style). Comments are a community feature and out of MVP scope (M2+).
- **External dictionary lookups.** These would send reader data to third parties. Term cards cover the project's vocabulary.
- **Offline download / PWA and EPUB export.** These belong to M4. Nothing here may block them; keep state in `localStorage`, not in-memory only.
- **Syncing across devices.** No accounts. Export/import (D4) is the manual path.
- **Paged mode, auto-hiding bar, page-turn tap zones** (dropped 2026-10-04). Paging only works with one layer, but comparing layers is the point of the reader. Hiding the bar hides the layer switch. Scroll reading with a TOC and an end-of-chapter card covers the need.

## Docs and tests
- **SDD §12 (Reader UI).** Update the table in the same PR. The reason: the maintainer asked for the reader to work like an e-book reader. Change the "Preferences" row and add rows for navigation, focus mode, annotations and read-aloud.
- **Repo `CLAUDE.md`.** Update the "Reader" note if the boot script or export step changes.
- **e2e (Playwright + axe):**
  - TOC open and close, plus keyboard;
  - previous/next and the end-of-chapter card across all four Manifesto chapters;
  - work page with and without JS;
  - progress label;
  - each theme passes axe;
  - prefs survive reload and apply before paint (no flash);
  - old `size` values migrate;
  - focus mode on/off, the layer switch still reachable, and the keyboard way back;
  - compare sheet for one passage;
  - passage actions menu by mouse, touch and keyboard;
  - highlight create/edit/delete (passage and text), and survival across reload;
  - an orphaned highlight shows on `/notes/`;
  - export → clear storage → import restores everything;
  - copy-with-citation text for both layers;
  - shortcuts and the setting that disables them;
  - the read-aloud player is hidden when `speechSynthesis` is stubbed out;
  - storage blocked: the reader still works with defaults.
- **Unit tests:** the text-quote anchoring (exact match, shifted text, quote gone), the time-left estimate, and the prefs/annotations migrations.

## Delivery
Parts A–F are independent and ship as separate PRs in this order (revised 2026-10-04): A (done) → B (with F) → D → E → C. Each PR updates the "Done" notes below and runs `pnpm check` and `pnpm e2e`. If a part grows too large, split it into its own task and link it here.

## Part F — Telling Plain English and Original apart when stacked

When Plain English and the Original are both on and stacked (phones, and below 60rem), a quick glance does not show which block is which. The small uppercase labels are easy to miss. Context already stands out (accent rule) and does not change.

- Give the Original a **subtle, quiet distinction** that does not break the reading flow: a faint paper-tone background, a hairline rule on the left, and slightly muted text. Plain English stays on the page background, so it reads as the main text.
- It must work in every theme (Part B), keep AA contrast, and not apply when only one layer is on (nothing to tell apart).
- Side-by-side columns already separate the layers by position and keep their current look.

## Decisions (maintainer, 2026-10-04)
1. **Default mode: Scroll.** Pages is an opt-in for single-layer reading. _Superseded by 6: paged mode is dropped._
2. **Fonts:** ship both **Atkinson Hyperlegible** and **OpenDyslexic**, each fetched only when chosen.
3. **Read-aloud:** the reader chooses the layer to listen to (Part E).
4. **Citation:** the maintainer asked what it meant. It is the "Copy with source" button in D5, now explained there in plain words. Plain English quotes are allowed, but are always labelled as our version.
5. **Stacked layers on mobile** need a subtle distinction (Part F).
6. **Model: study Bible app, not web novel** (after Part A). Paged mode and the auto-hiding bar are dropped; passage actions and Compare are added; the order becomes B+F → D → E → C. Further Bible-app features go to task 032.

## Acceptance
- From any chapter, a reader can reach the TOC, the work page and the previous/next chapter, with and without JS.
- Progress and time left are shown and update while reading.
- All Part B settings apply before first paint, survive reload, keep the layers distinct, and pass axe in every theme.
- Focus mode, Compare, passage actions, focus aids, wake lock and shortcuts work by keyboard and touch, and respect reduced motion.
- Highlights and notes survive reload and Plain English revisions (or are shown as orphaned), and export/import round-trips them.
- Read-aloud plays, follows along and can be paused, and is hidden where unsupported.
- Reader page JS growth is ≤ 40 KB gzipped. No new third-party requests (checked in the e2e network log).
- `pnpm check` and `pnpm e2e` pass. SDD §12 is updated.

## Done

### Part A — Navigation and structure (2026-10-04)
- **Work page** at the work's folder path, from the same `archive/[...path]` route (finalize-export turns it into `…/communist-manifesto/index.html`). `work.yml` has no description field, so none is shown; adding one would be a schema change and is left for when a work needs it. Reading times are for the Plain English (the Original where it is missing) at 200 wpm.
- **TOC:** a modal `<dialog>` drawer (native focus containment and Escape; a backdrop click closes it; focus returns to the button). Without JS, a `<details>` "Contents" list in the chapter header. Chapter names come from each chapter's "Chapter II. …" heading, since document titles are source page titles.
- **Previous/next:** end-of-chapter card, a "Chapters" nav and `<link rel="prev|next">` (React hoists them into `<head>`).
- **Progress:** per-row word counts are written at build time as `data-words="plain original context"` and `data-n` (passage number) on each row; `/data/v1` is unchanged. `wpm` is read from `plm:prefs` with a default of 200 until Part B adds the setting.
- **Stored shape:** `plm:reading = { v: 1, docs: { [path]: { title, work, workPath, passage, percent, updated, finished } } }`. The pre-031 `plm:progress:<path>` keys are read and folded in, then removed on the next write (`migrateHistory`, unit-tested).
- **Copy link to passage** sits under the bookmark star in a new `.row-tools` column, with a visible toast confirmation.
- The e2e fixture now has the Ch. II–IV sources (no renderings), so navigation is tested across four chapters. One older test now picks the first chapter search result, as the extra chapters change ranking.
- `t` opens the TOC for now. Part C moves it into the shared shortcut handler with the on/off setting.
