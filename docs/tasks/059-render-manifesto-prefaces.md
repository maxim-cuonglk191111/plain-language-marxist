# Task 059 — Plain English rendering of the *Communist Manifesto Prefaces* (Marx & Engels, 1872–1893)

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Done                                                             |
| **Filed**      | 2026-10-07                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Low (historical front-matter context)                           |
| **Milestone**  | M3 (archive growth & major works)                                |
| **Depends on** | 055 (manifesto prefaces ingestion)                               |
| **Related**    | 044 (1859 Preface), 058 (1857 Introduction)                      |

## Problem

The historical prefaces for *The Communist Manifesto* (1872 German, 1882 Russian, 1883 German, 1888 English, 1890 German, 1892 Polish, and 1893 Italian editions) were ingested in Task 055 with full source passages and vocabulary annotations. However, they currently lack a Plain English rendering (`en-plain.yml`).

These prefaces track the living evolution of the communist movement between 1848 and the 1890s, recording historical amendments (such as the Paris Commune lessons on ready-made state machinery) and international translations. A clean Plain English rendering completes the *Manifesto* archive.

## Scope & Document Structure

- **Target Document**: `content/works/marx/1848/communist-manifesto/preface`
- **Passages**: 66 passages
- **Sections**:
  1. *The 1872 German Edition* (`p00001`–`p00006`): Lessons of the Paris Commune on state machinery.
  2. *The 1882 Russian Edition* (`p00007`–`p00012`): Russian communal land ownership (*obshchina*) and world revolution.
  3. *The 1883 German Edition* (`p00013`–`p00016`): Engels's tribute to Marx and the fundamental proposition of historical materialism.
  4. *The 1888 English Edition* (`p00017`–`p00030`): Historical sketch of the Manifesto's editions and distinction between socialism and communism.
  5. *The 1890 German Edition* (`p00031`–`p00049`): Dissolution of the First International and the rise of the Second International.
  6. *The 1892 Polish Edition* (`p00050`–`p00058`): Industrial development of Poland and national independence.
  7. *The 1893 Italian Edition* (`p00059`–`p00066`): 1848 revolutions in Milan and Berlin and the historic mission of the working class.

## Acceptance Criteria

1. **Plain English Rendering File (`en-plain.yml`)**:
   - Complete coverage of all 66 passages.
   - Respects max sentence length (≤ 25 words per sentence for readability).
   - Preserves all registered term tokens and historical footnotes.
2. **Quality & Checks**:
   - `pnpm plm review content/works/marx/1848/communist-manifesto/preface en-plain` passes cleanly.
   - `pnpm plm validate` passes cleanly.

## Verification

- `pnpm plm review content/works/marx/1848/communist-manifesto/preface en-plain`
- `pnpm plm validate`
- `pnpm check`
- `pnpm e2e`
- `pnpm build:site`
