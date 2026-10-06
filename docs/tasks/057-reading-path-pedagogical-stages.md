# Task 057 — Restructure Reading Paths into Three Pedagogical Stages & Upgrade Marxism Fundamentals

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Done                                                             |
| **Filed**      | 2026-10-06                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Medium (pedagogical clarity and structured learning UX)          |
| **Milestone**  | M3 (archive growth & major works)                                |
| **Depends on** | 040 (reading path), 056 (1857 Introduction ingestion)            |
| **Related**    | 053 (home bookshelf), 031 (reading experience)                   |

## Problem

The current `marxism-fundamentals` reading path arranges 21 documents into a flat sequential checklist. Critical review revealed key pedagogical flaws:
1. **Theses on Feuerbach** is positioned at the very end (#21), obscuring its foundational role in establishing the revolutionary concept of practice (praxis) and critique of contemplative materialism.
2. The sequence lacks **cognitive layering**, blurring the distinct disciplines of:
   - *Philosophy & Praxis* (method of critique)
   - *Core Political Economy* (economic mechanics: wages, value, surplus)
   - *Historical Materialism & Method* (systematic historical framework and epistemological ascent from abstract to concrete)
3. The newly ingested **1857 Introduction (Einleitung)** needs to be incorporated as the methodological capstone right before *Capital*.

## Goal

1. **Restructure `content/collections/marxism-fundamentals.yml`:**
   - Move *Theses on Feuerbach* to immediately follow *Communist Manifesto*.
   - Sequence *Socialism: Utopian and Scientific*, the *1859 Preface*, and the *1857 Introduction* together.
   - Update `rationale` and `description` to clearly articulate the three-tier pedagogical design.
2. **Support Visual/Structural Stage Grouping in Web UI (`apps/web`):**
   - In `/paths/[id]/`, display or group steps under clear stage headings:
     - **Stage 1: History & Revolutionary Praxis** (*Principles of Communism*, *Manifesto* Ch. I, II, IV, *Theses on Feuerbach*)
     - **Stage 2: Core Political Economy Mechanics** (*Wage Labour and Capital*, *Value, Price and Profit*)
     - **Stage 3: Historical Materialism & Methodological Ascent to Capital** (*Socialism: Utopian and Scientific*, *1859 Preface*, *1857 Introduction*)
3. **Verify Compatibility:**
   - Ensure `pathprogress.ts`, localStorage tracking, and existing test suites continue to function seamlessly.

## Verification

- `pnpm plm validate`
- `pnpm check`
- `pnpm e2e`
- `pnpm build:site`
