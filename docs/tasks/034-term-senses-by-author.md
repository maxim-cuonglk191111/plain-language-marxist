# Task 034 — Term senses by author, period, and conceptual evolution

|                      |                                                                      |
| -------------------- | -------------------------------------------------------------------- |
| **Status**     | Open (ready for implementation once second text/author is staged)    |
| **Filed**      | 2026-10-05                                                           |
| **Owner**      | Unassigned                                                           |
| **Severity**   | High (core semantic requirement for scaling beyond a single text)    |
| **Milestone**  | M3 (archive growth & multi-author corpus)                            |
| **Depends on** | 010 (term system), 022 (term cards), 036 (term clarity)              |
| **Related**    | 032 B (concordance), 035 (council communism), 038 (visual companion) |

## Problem

The initial term system was built around a single foundational text (*The Communist Manifesto*, 1848). Each term card currently has exactly **one static definition** (`short`, `long`, `sources`). Only the Plain English surface wording can vary by context using `scoped_defaults` (e.g. `work:…` or `author:…`).

When scaling the archive across different texts, authors, and eras, this model breaks:

1. **Intra-Author Evolution (Shifts within the same author over time):**
   - In 1844–1848, Marx wrote simply of *labour* (*Arbeit*) being bought and sold.
   - By 1867 (*Das Kapital*, Vol. 1), Marx recognized this as a theoretical flaw and introduced the rigorous distinction between **labour** (the actual activity) and **labour-power** (*Arbeitskraft* — the commodity the worker actually sells). Defining "labour" identically in 1848 and 1867 misrepresents Marx's own theoretical breakthrough.
2. **Inter-Author & Inter-Tradition Divergence:**
   - **Party:** In 1848 (*Manifesto*), "party" meant an open political current or class movement. For Lenin (1902, *What Is To Be Done?*), it became the disciplined vanguard party. For Council Communists (1920s, Otto Rühle, Anton Pannekoek), "the revolution is not a party matter" — workers' councils replace the party.
   - **Dictatorship of the Proletariat:** In 1848, the democratic rule of the working majority; in 1871 (Engels on the Paris Commune), decentralized popular communes; in 1918–1921 (Lenin/Trotsky), state power exercised via the Bolshevik party; in 1920 (Councilists), direct governance by workers' factory committees.
   - **Socialism:** In 1848, largely reformist or reactionary bourgeois schools (Manifesto Ch. III); in 1875 (*Critique of the Gotha Programme*), the lower phase of communist society; in 20th-century social democracy, a welfare state within capitalism.

A single static card cannot serve as a dogmatic global dictionary. The cards must become a **comparative historical tool**.

## Goal

1. A term card dynamically displays **the exact sense relevant to the work being read first** ("In this text").
2. Readers can seamlessly compare how the concept evolved in other periods or was contested by other revolutionary currents ("Historical & Conceptual Evolution").
3. Preserve 100% backward compatibility with existing term cards.

## Proposed Architecture & Schema

### 1. Schema Extension (`content/vocabulary/{term}.yml`)

Add an optional `senses` array to the term schema:

```yaml
schema_version: 4
term: party
# Baseline general definition (fallback for general vocabulary index)
definition:
  short: "A political current or movement, or an organisation that fights for political power."
  sources: [...]

# Scoped senses for specific works, authors, or eras
senses:
  - scope: "work:marx:1848:communist-manifesto"
    short: "A broad class movement or political tendency, not a rigid electoral or cadre party."
    long: "In 1848, Marx and Engels used 'party' to mean the communist movement as a historical current uniting workers, rather than a single modern party apparatus with membership cards."
    sources:
      - title: "Manifesto of the Communist Party"
        author: "Karl Marx & Frederick Engels"
        year: 1848

  - scope: "author:lenin"
    short: "The disciplined vanguard organisation of professional revolutionaries leading the working class."
    long: "In 'What Is To Be Done?' (1902), Lenin argues that spontaneous trade unionism cannot achieve socialism; a centralized, disciplined vanguard party is required to bring socialist consciousness to the class."
    sources:
      - title: "What Is To Be Done?"
        author: "V. I. Lenin"
        year: 1902

  - scope: "movement:council-communism"
    short: "A bourgeois organ of representation that becomes unnecessary when workers govern directly through councils."
    sources:
      - title: "The Revolution Is Not a Party Matter"
        author: "Otto Rühle"
        year: 1920
```

### 2. Resolution Hierarchy

When resolving a term card inside a reader page, the resolver matches scopes in order of specificity:

$$
\text{Work Scope } (\texttt{work:\{author\}:\{year\}:\{slug\}}) \longrightarrow \text{Author Scope } (\texttt{author:\{slug\}}) \longrightarrow \text{Period Scope } (\texttt{period:\{start\}-\{end\}}) \longrightarrow \text{General Definition}
$$

The highest-ranking match becomes the primary **"In this text"** definition.

### 3. Term Card Component UI (`TermCards.tsx`)

1. **Active Sense Display ("In this text"):**
   - The card prominently shows the scoped definition matching the open text, badged with the work or author name.
2. **Comparative Section ("Evolution & Other Traditions"):**
   - Below the primary definition, an expandable section or tabbed interface shows the other senses with their respective historical dates and citations.
   - Distinct labels ensure neutrality: senses are descriptive ("How Lenin defined it in 1902", "How the 1848 Manifesto used it"), never prescriptive or sectarian (SDD §8.6).
3. **Vocabulary Index Page (`/vocabulary/[term]`):**
   - Displays all historical senses side-by-side or chronologically, allowing readers to study conceptual evolution at a glance.

### 4. Data Contract & Migration

1. Bump `schema_version` to `4` across `packages/schema`.
2. Add migration in `packages/cli/src/commands/migrate.ts`: cards without `senses` pass unchanged; existing `definition` remains valid.
3. Update `dist/data/v1/terms/{term}.json` contract:
   - Export optional `senses: Array<{ scope: string, short: string, long?: string, sources: Source[] }>`.

## Acceptance Criteria

- [ ] A term card opened in *Communist Manifesto* displays the 1848 sense first.
- [ ] When opened in a 20th-century text (e.g. Lenin or Rühle), the card displays that author's specific sense first.
- [ ] Readers can inspect other historical senses and citations within the card without leaving the reader.
- [ ] Schema validation enforces:
  - `short` length $\le 25$ words per sentence.
  - Every sense must cite at least one verified historical source (`title`, `author`, `year`).
  - Scopes must follow validated formats (`work:...`, `author:...`, `period:...`, `movement:...`).
- [ ] All existing 47 term files pass validation and `pnpm check`.
