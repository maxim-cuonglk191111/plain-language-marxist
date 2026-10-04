# Task 031 — E-book reader experience: navigation, appearance, immersive reading, highlights, read-aloud

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 014, 016, 023 |
| **Related** | 024 (term card stack), 030 (four chapters to navigate). PWA/offline and EPUB remain M4 |

## Goal
Make the reader feel like a good e-book or web-novel app (Kindle, Apple Books, KOReader, Moon+ Reader, Royal Road) rather than a document page. The reader should be able to:
- find their way around a work;
- shape the page to their eyes;
- read without distraction;
- mark and quote what matters;
- listen to a chapter being read aloud.

All of this keeps the platform's rules: static export, works without JavaScript, nothing leaves the browser, and the layers stay separate. This is the maintainer's request (2026-10-04).

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

## Part C — Immersive reading

1. **Focus mode.**
   - Toggled with a button or `f`.
   - Hides the site header and footer. The reader bar auto-hides on scroll down and returns on scroll up, or on a tap in the middle of the page (web-novel pattern).
   - Without reduced motion the bar slides; with reduced motion it simply shows or hides.
   - A focusable "Show controls" control stays first in tab order.
2. **Paged mode** (option: *Scroll* / *Pages*).
   - Pages are laid out with CSS multi-column over the chapter. Turn pages by:
     - tapping the left or right edge zones;
     - swiping;
     - using the arrow keys, PageUp/PageDown or Space.
   - The footer shows the page number and the pages left in the chapter.
   - Offered **only when exactly one layer is shown**. With two or three layers the aligned rows (023) cannot be paginated sensibly, so the option is disabled with a reason, and the reader falls back to Scroll if a second layer is turned on.
   - Paged mode must still honour `#p00017` deep links, by opening the page that contains the passage.
   - Record in this file whether paged mode is good enough to ship or should stay off by default.
3. **Peek at the other layer.** With only Plain English shown, a small control on each row (or long-press on touch) opens that passage's Original in a popover, and vice versa. The reader can check the source without switching layers. The popover is labelled with the layer name and closes on Escape or a click outside.
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

1. **Highlights.**
   - Select text in the Original or Plain English layer, then a small toolbar offers four colours, **Note**, **Copy with citation** and **Share**.
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
5. **Copy with citation.** Copies the selection followed by the citation, e.g.:

   > "…" — Marx & Engels, *Manifesto of the Communist Party* (1848), ch. I, trans. Moore (1888). Plain Language Marxist, <passage URL>

   - Selections from Plain English add "(plain-English rendering by PLM, not the original text)".
   - Copying from the Original uses the source attribution.
6. **Share.** Uses the Web Share API where available, and otherwise copies the link.

## Part E — Read aloud

- **Engine.** Reads the chapter with the browser's built-in Web Speech API (`speechSynthesis`). There is no server and no added cost.
- **What it reads.** The **first visible layer** by default (normally Plain English), switchable to the Original. Explanations are never read in the middle of text.
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

## Docs and tests
- **SDD §12 (Reader UI).** Update the table in the same PR. The reason: the maintainer asked for the reader to work like an e-book reader. Change the "Preferences" row and add rows for navigation, focus/paged mode, annotations and read-aloud.
- **Repo `CLAUDE.md`.** Update the "Reader" note if the boot script or export step changes.
- **e2e (Playwright + axe):**
  - TOC open and close, plus keyboard;
  - previous/next and the end-of-chapter card across all four Manifesto chapters;
  - work page with and without JS;
  - progress label;
  - each theme passes axe;
  - prefs survive reload and apply before paint (no flash);
  - old `size` values migrate;
  - focus mode hide/show and the keyboard way back;
  - paged mode turns pages and honours a deep link, and is disabled with two layers;
  - peek popover;
  - highlight create/edit/delete, and survival across reload;
  - an orphaned highlight shows on `/notes/`;
  - export → clear storage → import restores everything;
  - copy-with-citation text for both layers;
  - shortcuts and the setting that disables them;
  - the read-aloud player is hidden when `speechSynthesis` is stubbed out;
  - storage blocked: the reader still works with defaults.
- **Unit tests:** the text-quote anchoring (exact match, shifted text, quote gone), the time-left estimate, and the prefs/annotations migrations.

## Delivery
Parts A–E are independent and can ship as separate PRs in this order: A → B → C → D → E. Each PR updates the "Done" notes below and runs `pnpm check` and `pnpm e2e`. If a part grows too large, split it into its own task and link it here.

## Open questions for the maintainer
1. **Default mode:** Scroll (current) or Pages? *Proposed: Scroll.* Pages is opt-in and single-layer only.
2. **Fonts:** is Atkinson Hyperlegible enough, or should OpenDyslexic also ship? Each adds about 30–60 KB, fetched only when chosen.
3. **Read-aloud default layer:** Plain English, or whichever layer is first on screen? *Proposed: first visible layer.*
4. **Citation format:** is the example in D5 right? Should Plain English quotes be discouraged for citation altogether?

## Acceptance
- From any chapter, a reader can reach the TOC, the work page and the previous/next chapter, with and without JS.
- Progress and time left are shown and update while reading.
- All Part B settings apply before first paint, survive reload, keep the layers distinct, and pass axe in every theme.
- Focus mode, paged mode (single layer), peek, focus aids, wake lock and shortcuts work by keyboard and touch, and respect reduced motion.
- Highlights and notes survive reload and Plain English revisions (or are shown as orphaned), and export/import round-trips them.
- Read-aloud plays, follows along and can be paused, and is hidden where unsupported.
- Reader page JS growth is ≤ 40 KB gzipped. No new third-party requests (checked in the e2e network log).
- `pnpm check` and `pnpm e2e` pass. SDD §12 is updated.

## Done
_(fill in per part as it lands)_
