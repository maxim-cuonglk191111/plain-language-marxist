# Task 046 — Plain English Rendering of Value, Price and Profit (Marx, 1865)

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
Complete Plain English rendering, vocabulary tokens, and historical context explanations for Marx's *Value, Price and Profit* (1865).

## Scope
- 3 parts (`ch01`, `ch02`, `ch03` covering 14 sections).
- Written directly by Marx in English as an address to the First International debating citizen Weston.
- Bridges popular agitation directly into the rigorous concepts of *Capital*: value determined by socially necessary labour time, surplus value, rate of profit, and the struggle between capital and labour over the working day and wages.
- Render all 3 parts into Plain English (`en-plain.yml`).

## Completion Summary
- Rendered all 159 passages across all 3 chapters (`ch01`–`ch03`, covering all 14 sections) into Plain English in `en-plain.yml` with vocabulary tokens (`{commodity:sg}`, `{commodity:pl}`, `{capital:sg}`, `{labour-power:sg}`, `{wage-labour:sg}`, `{division-of-labour:sg}`, `{means-of-production:sg}`, `{instruments-of-production:sg}`, `{means-of-subsistence:sg}`, `{serf:sg}`, `{mode-of-production:sg}`, `{exploitation:sg}`, `{conservative:adj}`, `{revolution:adj}`, etc.) and full editorial compliance (0 findings).
- Added 9 historical context explanations across all 3 chapters in `explanations.yml` (all sentences $\le 21$ words):
  - Citizen Weston and the First International debate over trade union wage strikes (ch01).
  - The Ten Hours Act of 1847 and the refutation of Senior's "last hour" profit fallacy (ch01).
  - David Ricardo's 1817 refutation of the dogma that "wages determine prices" (ch01).
  - Marx's distinction between labour and labour-power (ch02).
  - Primitive accumulation as historical original expropriation of producers (ch02).
  - Feudal corvée labour vs the wage-form optical illusion that masks unpaid surplus labour (ch02).
  - The anti-Jacobin war, lengthened working days, and 1765 "Houses of Terror" workhouses (ch03).
  - The progressive rise in the organic composition of capital and the creation of relatively redundant labour (ch03).
  - The role of Trade Unions: essential guerrilla resistance against capital, moving beyond "A fair day's wage for a fair day's work" to the revolutionary watchword "Abolition of the wages system!" (ch03).
- Verified validation (`plm validate`), test suite (`pnpm check` with 423 passing vitest tests, 734 renderings built), and full end-to-end suite (`pnpm e2e`). Restored static production export via `pnpm build:site`.
