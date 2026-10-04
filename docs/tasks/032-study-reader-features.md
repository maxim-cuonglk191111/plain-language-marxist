# Task 032 — Study reader features from Bible apps: passage references, concordance, reading paths, quote cards

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 (Parts A, B, E), M3 (Parts C, D) |
| **Depends on** | 031 (passage actions D1, Copy with source D5) |
| **Related** | 015/022/024 (term cards), SDD §5.7 (reading paths), §12 (Reader UI) |

## Why
After task 031 Part A, the maintainer chose the **study Bible app** as the model for the reader instead of a web-novel app (031, "Direction"). Study Bible apps solve almost the same problem as this project: an old canonical text, read next to modern versions, that people study, cite, mark up and discuss.

Research (2026-10-04) on the three best-known apps:
- **YouVersion:** compare one verse across versions; highlights in several colours, notes and bookmarks; shareable verse images; audio; reading plans with progress; offline.
- **BibleGateway:** parallel view of 2–3 versions; footnotes and cross-references that can be switched on and off; look-up by reference ("John 3:16"); keyword search; commentaries.
- **Blue Letter Bible:** tap a word to see the original-language word, its definition and **every other place it appears** (concordance); interlinear text.

Task 031 already covers parallel layers, highlights, notes, bookmarks, Compare (C3), audio (E) and search. This task covers the rest that fits the project.

| Bible-app feature | PLM equivalent | Part |
|---|---|---|
| Verse numbers and references ("John 3:16") | Passage numbers and references ("Manifesto II.17") | A |
| Strong's concordance ("every place this word appears") | Every place a vocabulary term appears | B |
| Reading plans | Reading paths (already in the schema, SDD §5.7) | C |
| Cross-references | "See also" links between passages | D |
| Verse images | Quote cards | E |

## Constraints
The same as task 031: static export and a no-JS baseline, nothing leaves the browser, layers stay separate, WCAG 2.2 AA, persisted shapes migrate first. In particular:
- Anything shown or shared from Plain English is labelled as the PLM version, never as the author's words (SDD §12, 031 D5).
- Reading paths are always "suggested", never "correct" (SDD §5.7). No ranking of traditions.
- No engagement mechanics (see "Out of scope").

---

## Part A — Passage numbers and references (M1)
Bible readers find and cite text by reference. PLM passages already have stable IDs (`p00017`, never renumbered because the source is immutable), so they can work the same way.

1. **Reference format.** `<work short name> <chapter>.<passage>`, e.g. **Manifesto II.17** = `…/communist-manifesto/ch02.htm#p00017`. The chapter number comes from the chapter heading (as in 031 A); the passage number is the number in the passage ID.
   - The work short name needs a home. Proposal: an optional `short_title` in `work.yml` (a persisted shape: bump `schema_version` and ship the `plm migrate` step in the same commit). Fallback: the full title.
2. **Passage numbers in the margin**, like verse numbers. A setting (Show / Hide), default **Show** in multi-layer views and **Hide** with one layer. Small, muted, and not part of the copied text.
3. **Go to a reference.** The search box and the TOC drawer accept references such as `II.17`, `Manifesto 2.17`, `ch2 17` and jump to the passage. Unknown references say so plainly. Without JS, the TOC links still work.
4. **Use the reference everywhere** a passage is named: Copy with source (031 D5), the notes page, bookmarks, the progress label ("Passage 17 of 65" → "II.17 · 42%").

## Part B — Where a term appears: concordance (M1)
In Blue Letter Bible, tapping a word shows every other place it appears. PLM already marks every vocabulary term in the Original (`original-terms.yml`) and in Plain English (term tokens).

1. **Term page:** a section "Where this term appears (N)", grouped by work and chapter. Each item shows the reference (Part A), a short snippet with the term marked, and a link to the passage. Original and Plain English occurrences are labelled separately.
2. **Term card:** a link "Appears N times in the texts →" to that section.
3. Computed at build time from documents already loaded. If the data contract has to carry it, add it to `DataTerm` as an optional field (backward-compatible, like task 022's `example`).

## Part C — Reading paths, reader side (M3)
YouVersion's reading plans map onto PLM's **reading paths** (`content/collections/*.yml`, `kind: reading_path`), which the schema already has, with no reader UI yet.

1. **Path page** at `/paths/<id>/`. It shows the title, the description, the **rationale** (who suggests this order and why), and the steps (works or chapters) with reading times (031 A).
2. **Local progress.** Steps are checked off from the reading history (`plm:reading`, 031 A) when a chapter is finished, and the reader can tick or untick a step by hand. "Continue this path" goes to the first unfinished step.
3. **Labelled as suggested.** The page says "A suggested reading order", never "the correct order", and lists other paths when there are several.
4. No days, dates, streaks or reminders (see "Out of scope").
5. Needs at least one reading path in `content/`. That is an editorial task (M3). The UI can be built and tested first against a path in the e2e fixture.

## Part D — Cross-references: "See also" (M3)
BibleGateway shows cross-references between verses. In PLM they would link passages that are factually connected, for example: Engels' 1888 footnotes and the passages they explain, a later preface that revises a point in a chapter, or the same argument made in another work.

1. **Content:** a new persisted shape, e.g. `crossrefs.yml` per document: `{ from: p00017, to: <document id>#p00005, kind: revises | explains | same-argument | quotes, note? }`. Schema version, validation (both ends exist), and a `plm migrate` step in the same commit.
2. **Editorial rule:** cross-references state a connection, not an interpretation. Anything interpretive goes into the Context layer (SDD §8.6). Add the rule to `docs/editorial/`.
3. **Reader:** a "See also" line at the end of the passage's Context cell, switched on and off with the Context layer. Each link shows the reference (Part A) and the kind.
4. Mostly useful once there is more than one work (M3). The Manifesto prefaces are the first natural case.

## Part E — Quote cards (M1)
YouVersion lets readers turn a verse into an image for sharing. PLM readers share quotes on social media too, so the quote should carry its source.

1. From the passage actions or a text selection (031 D1), **Make a quote card**: the quote, the reference and the source line from 031 D5, drawn on a `<canvas>` in the browser.
2. **A Plain English quote** card always says "Plain English version by Plain Language Marxist, not the original wording". An Original quote names the translator.
3. A few plain layouts (light, dark, sepia), using the self-hosted fonts from 031 B. No photos, and no third-party image services.
4. **Download** as PNG, or **Share** with the Web Share API (files) where supported.
5. Has alt text: the card's text is offered with the image when shared, where the platform allows.

---

## Needs a maintainer decision (not in scope until decided)
- **Discussion questions per chapter** (like YouVersion devotionals or study-Bible notes). They would help study groups. This is new editorial content: an explanation kind or a new file? Who writes and reviews it?
- **The German original as a layer** (like the original-language view in Blue Letter Bible). The 1848 German text is public domain and on MIA. But a fourth layer changes the layer model (task 023) and the SDD, so it would be its own task.

## Out of scope (and why)
- **Streaks, "verse of the day" reminders, badges, push notifications.** SDD §12 rules out gamification, and a static site sends no notifications.
- **Friends, social feeds, shared highlights.** Community features belong to M2+, with accounts. Here everything stays in the browser.
- **Word-by-word interlinear between Original and Plain English.** Plain English is a rewording of each passage, not a word-for-word gloss, so the words do not line up. Term marks and Compare (031 C3) are the honest equivalent.
- **Commentaries by outside authors.** The Context layer, with its sources, is where explanation lives (task 025).
- **Offline downloads.** M4 (PWA), as in task 031.

## Docs and tests
- SDD §12: add rows for passage references, concordance, reading paths, cross-references and quote cards as each part lands, saying it follows the maintainer's choice of a study-Bible-app model.
- e2e: reference look-up (valid, invalid, no JS); passage numbers on and off; term page concordance counts; path page progress from finished chapters; "See also" links follow the Context layer; quote card text for both layers (check the canvas source text, not pixels); axe on each new surface.
- Unit tests: the reference parser, and the crossrefs schema and validation.

## Delivery
A → B → E (M1), then C and D with M3 content. Separate PRs. Each updates "Done" below and runs `pnpm check` and `pnpm e2e`.

## Done
_(fill in per part as it lands)_
