# Task 048 — Source Ingestion of Das Kapital, Volume I (Marx, 1867)

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-06 |
| **Owner** | maxim-cuonglk191111 |
| **Severity** | High (foundational primary source) |
| **Milestone** | M3 (archive expansion) |
| **Depends on** | 041 (fundamentals ingestion), 039 (major works survey) |

## Goal
Ingest, verify, snapshot, and stage the complete 33 chapters and prefaces of Karl Marx's *Das Kapital*, Volume I into `content/works/marx/1867/capital-vol1/`.

## Scope
- Edition: Samuel Moore & Edward Aveling English translation (1887), edited by Friedrich Engels.
- Source: Marxists Internet Archive (`marx/works/1867-c1/`).
- Documents:
  - Prefaces and Postfaces (`pref-1st`, `pref-2nd`, `pref-3rd`, `pref-4th`, `pref-eng`)
  - Chapters 1 through 33 (`ch01` to `ch33`).
- Batch import via `plm import --via wayback`.
- Run `plm annotate` to seed terminology marks across the economic ontology.
- Ensure `work.yml` records `rights.status: PUBLIC_DOMAIN`.
