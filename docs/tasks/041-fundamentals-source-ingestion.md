# Task 041 — Source Ingestion for the Marxism Fundamentals Corpus

| | |
|---|---|
| **Status** | Open (ready for execution: survey, rights check, and batch import) |
| **Filed** | 2026-10-06 |
| **Owner** | Unassigned |
| **Severity** | High (content infrastructure prerequisite for the Fundamentals path) |
| **Milestone** | M3 (archive expansion) |
| **Depends on** | 039 (major works survey), 040 (fundamentals roadmap) |
| **Related** | 008 (MIA adapter), 032 C (reading paths), 034 (term senses) |

## Context & Architectural Principle

A core distinction in Plain Language Marxist:
1. **The Archive (`content/works/`, route `/archive/...`)**: Houses **complete works**. Every book imported must eventually be preserved and translated in its entirety (all chapters, full Plain English, full context explanations, complete vocabulary marks). No work is stored as fragments.
2. **Reading Paths (`content/collections/`, route `/paths/...`)**: Pedagogical study guides. A reading path curates and links **only the essential chapters** needed to build a conceptual progression (e.g. for the *Manifesto*, only Chapters I, II, and IV; for *Capital*, the core theoretical chapters on commodity, surplus value, and primitive accumulation).

To ensure the **Marxism Fundamentals** reading path ([Task 040](040-marxism-fundamentals-reading-path.md)) is backed by authentic, accessible primary texts rather than stubs, we must ingest and stage the **complete source texts** of the remaining foundational works before undertaking chapter-by-chapter Plain English rendering.

## The Fundamentals Corpus & Public Domain Editions

Every edition must be verified as **Public Domain** (published before 1931, or author/translator died $\ge 70$ or $100$ years ago).

| # | Work | Author & Date | Chapters / Parts | Public Domain English Edition to Ingest | Source Provider | Status |
|---|---|---|---|---|---|---|
| 1 | *Manifesto of the Communist Party* | Marx & Engels (1848) | 4 chapters (all) | Samuel Moore trans. (1888), ed. Engels | MIA | **Done** (Full 3-layer rendering complete) |
| 2 | *Value, Price and Profit* | Marx (1865) | 3 parts (14 sections) | Marx's original English (1865), ed. Eleanor Marx (1898) | MIA | **Source staged** (Full 3 parts in `source.yml`) |
| 3 | *Principles of Communism* | Engels (1847) | 1 document (25 Q&A) | Max Bedacht / Sweezy / Paul Sweezy or pre-1930 trans. (check rights) | MIA / Gutenberg | **To import** |
| 4 | *Wage Labour and Capital* | Marx (1849/1891) | 5 chapters/sections | J. L. Joynes trans. (1885) or Harriet Lothrop (1902) | Gutenberg / MIA | **To import** |
| 5 | *Theses on Feuerbach* | Marx (1845) | 1 document (11 theses) | Austin Lewis trans. (1903, in *Feuerbach*) | Gutenberg #27814 | **To import** |
| 6 | *Socialism: Utopian and Scientific* | Engels (1880) | 3 chapters | Edward Aveling trans. (1892, Swan Sonnenschein) | MIA / Gutenberg | **To import** |
| 7 | *A Contribution to the Critique of Political Economy* (Preface & Intro) | Marx (1859) | Preface & 1857 Intro | N. I. Stone trans. (1904, Charles H. Kerr) | Gutenberg #46423 | **To import** |
| 8 | *Das Kapital*, Vol. I | Marx (1867) | 33 chapters | Samuel Moore & Edward Aveling trans. (1887), ed. Engels | MIA / Gutenberg | **To stage** |

## Implementation Phases

### Phase 1: Gutenberg Source Adapter (Technical Enabler)
Several crucial early translations (Stone's 1904 *Contribution*, Lewis's 1903 *Feuerbach*, De Leon's 1897 *Eighteenth Brumaire*) are hosted on Project Gutenberg rather than MIA.
- Implement `GutenbergAdapter` in `packages/parser/src/gutenberg/adapter.ts`.
- Follow `docs/architecture/parser-guide.md`:
  - Strip Project Gutenberg header metadata and trailing license boilerplate.
  - Parse chapter headings, body paragraphs, blockquotes, and footnotes cleanly.
  - Write test fixtures and golden outputs in `packages/parser/fixtures/gutenberg/`.
  - Add `gutenberg` to `SourceProvider` in schema and CLI.

### Phase 2: Ingestion of Short Foundational Works
1. ***Theses on Feuerbach* (1845)**:
   - Run `plm import` from Gutenberg #27814.
   - Verify 11 theses formatting and public domain status.
2. ***Contribution to the Critique of Political Economy* (1859)**:
   - Run `plm import` from Gutenberg #46423 (the classic Preface on base/superstructure and mode of production).
3. ***Principles of Communism* (1847)**:
   - Survey MIA and Gutenberg for the free public domain translation.
   - Import into `content/works/engels/1847/principles-of-communism/`.

### Phase 3: Ingestion of Major Political Economy Foundations
1. ***Wage Labour and Capital* (1849/1891)**:
   - Import all 5 sections into `content/works/marx/1849/wage-labour-and-capital/`.
2. ***Socialism: Utopian and Scientific* (1880)**:
   - Import all 3 chapters into `content/works/engels/1880/socialism-utopian-scientific/`.
3. ***Das Kapital*, Volume I (1867)**:
   - Import key chapters using Moore & Aveling's 1887 edition from MIA into `content/works/marx/1867/capital-vol1/`.

### Phase 4: Reading Path Integration
- Once source texts exist in `content/works/`:
  - Update `content/collections/marxism-fundamentals.yml` to reference the exact essential chapters.
  - All items use uniform `document:...` IDs, rendering identically in the reader and path progress trackers.
- Content teams can then take on Plain English rendering and explanations work text-by-text without blocking the archive roadmap.

## Acceptance Criteria
- Full text `source.yml`, raw HTML snapshots, and vocabulary markings exist for each staged work.
- Every work's `work.yml` records `rights.status: PUBLIC_DOMAIN`, with edition, translator, and maintainer verification.
- `pnpm plm validate` and `pnpm check` pass with zero errors.
- Reading path `/paths/marxism-fundamentals/` reflects the expanded, curated list of essential chapters with exact word counts and reading times.
