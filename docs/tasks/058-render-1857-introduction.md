# Task 058 — Plain English rendering of the *1857 Introduction* (Marx, Critique of Political Economy)

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Done                                                             |
| **Filed**      | 2026-10-07                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Medium (major archive work & methodological capstone)             |
| **Milestone**  | M3 (archive growth & major works)                                |
| **Depends on** | 056 (1857 Introduction ingestion)                               |
| **Related**    | 044 (1859 Preface), 057 (reading path pedagogical stages)         |

## Problem

The 1857 Introduction (*Einleitung*) to *A Contribution to the Critique of Political Economy* was ingested in Task 056 with full source passages and vocabulary annotations (`original-terms.yml`). As the concluding text of Stage 3 in the *Marxism Fundamentals: Road to Capital* reading path, it serves as the crucial methodological bridge to *Das Kapital*. However, it currently lacks a Plain English rendering (`en-plain.yml`), leaving readers with only the original Victorian translation.

Because of its dense dialectical formulations on the ascent from abstract to concrete, social totality, and the relations between production, distribution, exchange, and consumption, an accessible Plain English translation is vital.

## Scope & Document Structure

- **Target Document**: `content/works/marx/1859/critique-of-political-economy/intro`
- **Passages**: 96 passages (~11,266 words)
- **Sections**:
  1. *Production in General* (passages `p00001`–`p00021`): Critique of Robinsonades and bourgeois universalization of historical production relations.
  2. *The General Relation of Production to Distribution, Exchange, and Consumption* (passages `p00022`–`p00058`): Dialectical identity, distinction, and mutual interaction of economic moments, with production as the determining totality.
  3. *The Method of Political Economy* (passages `p00059`–`p00085`): Scientific ascent from the abstract to the concrete; distinction between real historical development and theoretical thought-reproduction.
  4. *Production, Means of Production and Relations of Production* (passages `p00086`–`p00096`): Uneven development of material production and artistic/legal consciousness (e.g. Greek art and modern society).

## Acceptance Criteria

1. **Plain English Rendering File (`en-plain.yml`)**:
   - Complete coverage of all 96 passages.
   - Respects max sentence length (≤ 25 words per sentence for readability).
   - Preserves all registered term tokens (e.g. `{means-of-production}`, `{relations-of-production}`, `{exchange-value}`).
   - Avoids colloquialisms, jargon, and bourgeois modernizations while rendering German dialectical concepts into natural, accessible English.
2. **Quality & Checks**:
   - `pnpm plm review content/works/marx/1859/critique-of-political-economy/intro en-plain` passes cleanly with 0 errors.
   - `pnpm plm validate` passes cleanly with 0 errors.
   - Reading time, word count, and passage alignment verify accurately in the web reader.

## Verification

- `pnpm plm review content/works/marx/1859/critique-of-political-economy/intro en-plain`
- `pnpm plm validate`
- `pnpm check`
- `pnpm e2e`
- `pnpm build:site`
