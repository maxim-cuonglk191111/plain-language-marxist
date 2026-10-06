# Task 056 — Ingest 1857 Introduction to A Contribution to the Critique of Political Economy (Einleitung)

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Done                                                             |
| **Filed**      | 2026-10-06                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Medium (foundational methodological text for reading Capital)    |
| **Milestone**  | M3 (archive growth & major works)                                |
| **Depends on** | 044 (1859 Preface), 040 (reading paths)                          |
| **Related**    | 057 (reading path pedagogical stages), 048 (Capital Vol. 1)       |

## Problem

In the preparatory reading path for *Das Kapital*, readers need to understand Marx’s method of rising from the abstract to the concrete and the dialectical unity of production, distribution, exchange, and consumption. While the 1859 Preface establishes historical materialism concisely, Marx's **1857 Introduction (Einleitung)**—drafted in August–September 1857 for the *Grundrisse* and published as the primary appendix to *A Contribution to the Critique of Political Economy*—is the definitive primary text detailing Marx's methodology of political economy.

Without this text in the archive, the reading path lacks the direct epistemological bridge between historical materialism and the opening chapters of *Capital*.

## Goal

Ingest the 1857 Introduction into `content/works/marx/1859/critique-of-political-economy/intro/`:

1. **Ingest via Wayback Machine:**
   - Source URL: `https://www.marxists.org/archive/marx/works/1859/critique-pol-economy/appx1.htm`
   - Command: `plm import --work marx/1859/critique-of-political-economy --doc intro --via wayback --yes`
2. **Annotate with Established Vocabulary:**
   - Run `plm annotate` against the vocabulary term set.
3. **Register in Work Manifest:**
   - Add `intro` to `content/works/marx/1859/critique-of-political-economy/work.yml`.
4. **Reader Navigation:**
   - Ensure `reading.ts` names the document cleanly as "Introduction (1857)" with short title "1857 Intro".

## Verification

- `pnpm plm validate`
- `pnpm check`
- `pnpm e2e`
