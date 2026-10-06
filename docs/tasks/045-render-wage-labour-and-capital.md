# Task 045 — Plain English Rendering of Wage Labour and Capital (Marx, 1849/1891)

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
Complete Plain English rendering, vocabulary tokens, and historical context explanations for Marx's *Wage Labour and Capital* (1849, ed. Engels 1891).

## Scope
- 9 chapters (`ch01` through `ch09`).
- Core economic foundation: what are wages, determination of commodity prices, cost of production, nature of capital, relation of wage-labour to capital, and the law of competition.
- Render all 9 chapters into Plain English (`en-plain.yml`).
- Explicitly annotate the crucial theoretical revision made by Engels in 1891 (the difference between selling "labour" and selling "labour-power").
- Add Context notes (`explanations.yml`) on historical wages, gold standard, and piece-wages.

## Completion Summary
- Rendered all 142 passages across all 9 chapters (`ch01`–`ch09`) into Plain English in `en-plain.yml` with vocabulary tokens (`{capital:sg}`, `{wage-labour:sg}`, `{labour-power:sg}`, `{commodity:sg}`, `{means-of-production:sg}`, `{division-of-labour:sg}`, `{bourgeoisie:sg}`, `{proletariat:sg}`, `{world-market:sg}`, etc.) and full editorial compliance (0 findings).
- Added 22 historical context explanations across all 9 chapters in `explanations.yml` covering:
  - 1848 revolutionary background and the *Neue Rheinische Zeitung* (ch01).
  - 1840s historical wages (shillings, time-wages vs piece-wages), Engels's pivotal 1891 correction of "labour" to "labour-power", and the legal vs economic status of slaves, serfs, and free wage-workers (ch02).
  - Cost of production as the center of gravity, anarchy of production, and labour-time as the foundation of value (ch03).
  - Skill wage differentials, human depreciation and generational reproduction, and the social minimum wage (ch04).
  - Commodity fetishism / capital as a social relation of production, historical stages of production, and dead labour's domination over living labour (ch05).
  - The house vs palace metaphor of relative deprivation, the 16th-century Price Revolution / American bullion influx, and nominal vs real vs relative wages (ch06).
  - The precursor to Marx's $c + v + s$ value formula, relative impoverishment during economic booms, and the antagonistic law of inverse proportion between wages and profits (ch07).
  - The "golden chains" of capital accumulation, super-profits through innovation, and the competitive equalization of prices (ch08).
  - The substitution of adult male labour by women and children, refutation of bourgeois "compensation theory", and recurrent crises of overproduction on the world market (ch09).
- Verified validation (`plm validate`), test suite (`pnpm check`), and end-to-end suite (`pnpm e2e` with 153 passing tests). Generated 87 static production routes with 575 renderings.
