# Task 044 — Plain English Rendering of the 1859 Preface (Marx, Critique of Political Economy)

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-06 |
| **Completed** | 2026-10-06 |
| **Owner** | Assistant |
| **Severity** | High |
| **Milestone** | M3 (content rendering) |
| **Depends on** | 041 (source ingestion) |

## Goal
Complete Plain English rendering, vocabulary tokens, and historical context explanations for Marx's *Preface to A Contribution to the Critique of Political Economy* (1859).

## Scope
- 1 document (`preface`), 16 passages.
- Contains the single most famous summary of historical materialism: the relations of production, economic structure of society, legal and political superstructure, and the era of social revolution.
- Render into Plain English (`en-plain.yml`) with meticulous clarity, untangling Marx's dense Hegelian periodic sentences.
- Add Context explanations (`explanations.yml`) detailing Marx's intellectual journey from the *Rheinische Zeitung* through the Paris manuscripts and the 1848 revolutions.

## Completion Summary
- Rendered all 16 passages in `content/works/marx/1859/critique-of-political-economy/preface/en-plain.yml` with vocabulary tokens (`{relations-of-production:sg}`, `{productive-forces:sg}`, `{mode-of-production:sg}`, `{bourgeoisie:adj}`, `{capital:sg}`, `{wage-labour:sg}`, `{world-market:sg}`, etc.) and full editorial compliance (0 findings in `plm review`).
- Added 4 historical context explanations in `content/works/marx/1859/critique-of-political-economy/preface/explanations.yml` covering the *Rheinische Zeitung* disputes, Marx's Paris studies of 1844, the base-superstructure materialist conception, and *The German Ideology* / gnawing criticism of the mice.
- Verified validation (`plm validate`), test suite (`pnpm check`), and end-to-end suite (`pnpm e2e`). All 153 e2e tests passing, 87 static routes generated.
