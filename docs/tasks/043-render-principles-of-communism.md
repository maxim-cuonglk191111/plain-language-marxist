# Task 043 — Plain English Rendering of The Principles of Communism (Engels, 1847)

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-06 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M3 (content rendering) |
| **Depends on** | 041 (source ingestion) |

## Goal
Complete Plain English rendering, vocabulary tokens, and historical context explanations for Friedrich Engels's *The Principles of Communism* (1847).

## Scope & Implementation
- 1 document (`prin-com`), 25 Questions & Answers, 162 passages.
- Rendered all 25 Q&A into Plain English (`en-plain.yml`) meeting every strict editorial check (sentences ≤ 35 words, preserved modality, vocabulary tokens integrated, 0 warnings in `plm review`).
- Added historical context explanations (`explanations.yml`) covering the drafting history for the Communist League, the shift from craft guilds to mechanized industry, the recurring panic and crisis cycle (notably 1847), and the Chartist movement in Britain.
- Verified across `plm validate`, `pnpm check`, `pnpm e2e` (153 tests passing), and `pnpm build:site`.
