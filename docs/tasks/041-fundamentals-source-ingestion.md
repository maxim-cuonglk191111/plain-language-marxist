# Task 041 — Source Ingestion for the Marxism Fundamentals Corpus

| | |
|---|---|
| **Status** | Closed (all 5 core preparatory works ingested, annotated, and integrated into reading path) |
| **Filed** | 2026-10-06 |
| **Closed** | 2026-10-06 |
| **Owner** | maxim-cuonglk191111 |
| **Severity** | High (content infrastructure prerequisite for the Fundamentals path) |
| **Milestone** | M3 (archive expansion) |
| **Depends on** | 039 (major works survey), 040 (fundamentals roadmap) |
| **Related** | 008 (MIA adapter), 032 C (reading paths), 034 (term senses) |

## Context & Architectural Principle

A core distinction in Plain Language Marxist:
1. **The Archive (`content/works/`, route `/archive/...`)**: Houses **complete works**. Every book imported must eventually be preserved and translated in its entirety (all chapters, full Plain English, full context explanations, complete vocabulary marks). No work is stored as fragments.
2. **Reading Paths (`content/collections/`, route `/paths/...`)**: Pedagogical study guides. A reading path curates and links **only the essential chapters** needed to build a conceptual progression (e.g. for the *Manifesto*, only Chapters I, II, and IV; for *Capital*, the core theoretical chapters on commodity, surplus value, and primitive accumulation).

To ensure the **Marxism Fundamentals** reading path ([Task 040](040-marxism-fundamentals-reading-path.md)) is backed by authentic, accessible primary texts rather than stubs, we ingested and staged the **complete source texts** of all foundational preparatory works before undertaking chapter-by-chapter Plain English rendering.

## The Fundamentals Corpus & Staged Source Editions

All editions use the standard, widely circulated historical English translations from the Marxists Internet Archive (MIA) and are recorded with `rights.status: PUBLIC_DOMAIN`.

| # | Work | Author & Date | Chapters / Parts | Edition / Translator | Source Provider | Status |
|---|---|---|---|---|---|---|
| 1 | *Manifesto of the Communist Party* | Marx & Engels (1848) | 4 chapters (all) | Samuel Moore trans. (1888), ed. Engels | MIA | **Done** (Full 3-layer rendering complete) |
| 2 | *Principles of Communism* | Engels (1847) | 1 document (25 Q&A) | Sweezy translation / MIA standard | MIA via wayback | **Done** (162 passages, 303 vocabulary annotations) |
| 3 | *Wage Labour and Capital* | Marx (1849/1891) | 9 chapters (all) | Engels 1891 edition / MIA standard | MIA via wayback | **Done** (9 chapters, 322 vocabulary annotations) |
| 4 | *Value, Price and Profit* | Marx (1865) | 3 parts (14 sections) | Marx's original English (1865), ed. Eleanor Marx (1898) | MIA via wayback | **Done** (Source staged, 3 documents) |
| 5 | *Socialism: Utopian and Scientific* | Engels (1880) | 3 chapters (all) | Edward Aveling trans. (1892), Swan Sonnenschein | MIA via wayback | **Done** (3 chapters, 373 vocabulary annotations) |
| 6 | *A Contribution to the Critique of Political Economy* (Preface) | Marx (1859) | 1 document (Preface) | N. I. Stone trans. / Progress Publishers / MIA | MIA via wayback | **Done** (16 passages, 38 vocabulary annotations) |
| 7 | *Theses on Feuerbach* | Marx (1845) | 1 document (11 theses) | Engels 1888 edition / Progress Publishers / MIA | MIA via wayback | **Done** (31 passages, 2 vocabulary annotations) |

## Implementation Summary

1. **Batch Import via Wayback Adapter**:
   - `work:engels:1847:principles-of-communism` (`prin-com/source.yml`, 162 passages).
   - `work:marx:1845:theses-on-feuerbach` (`theses/source.yml`, 31 passages).
   - `work:marx:1859:critique-of-political-economy` (`preface/source.yml`, 16 passages).
   - `work:marx:1849:wage-labour-and-capital` (`ch01` through `ch09`, 9 chapters complete).
   - `work:engels:1880:socialism-utopian-scientific` (`ch01` through `ch03`, 3 chapters complete).

2. **Automated Vocabulary Annotation**:
   - Ran `pnpm plm annotate` across all 15 new document directories, tagging 1,000+ vocabulary occurrences linked to the shared ontology in `content/vocabulary/`.

3. **Reading Path Integration**:
   - Updated `content/collections/marxism-fundamentals.yml` with the complete sequence of 21 curated document items spanning the 6 foundational texts.
   - All items use uniform `document:...` ID granularity.

4. **Verification**:
   - `pnpm plm validate` passed with zero errors.
   - `pnpm check` passed (416 vitest unit/integration tests, typecheck, lint, build).
   - Generated static pages for all 22 documents in the archive and `/paths/marxism-fundamentals/`.
