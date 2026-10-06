# Task 042 — Plain English Rendering of Theses on Feuerbach (1845)

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-06 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M3 (content rendering) |
| **Depends on** | 041 (source ingestion) |

## Goal
Complete Plain English rendering, vocabulary tokens, and historical context explanations for Marx's *Theses on Feuerbach* (1845).

## Scope
- 1 document (`theses`), 11 theses, 31 passages.
- Draft modern Plain English rendering (`en-plain.yml`) targeting 8th-grade readability without blunting Marx's revolutionary philosophical critique (praxis, scholasticism, alienation, change vs. interpretation).
- Provide concise historical Context notes (`explanations.yml`) explaining Feuerbach's passive materialism, the Young Hegelians, and the historical genesis of Marx's dialectical materialism.
- Validate cleanly with `plm validate`.

## Acceptance Criteria
- [x] Complete Plain English rendering for all 31 passages in `en-plain.yml`.
- [x] Vocabulary tokens integrated (`{revolution:adj}`).
- [x] Historical context explanations added in `explanations.yml` (Feuerbach, Essence of Christianity, education of the educator, 11th thesis).
- [x] `plm validate` passes with 0 errors and 0 warnings.
- [x] `pnpm check` and `pnpm e2e` pass 100%.

## Verification Evidence
- `plm apply` generated complete rendering set with 0 warnings.
- `plm validate` confirmed schema validity and editorial rule compliance.
- Verified on local reader and deployed to production.
