# Task 054 — Support Work Parts Hierarchy and Front Matter Navigation (Das Kapital Vol. 1)

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Open                                                             |
| **Filed**      | 2026-10-06                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Medium (reader navigation clarity for large multi-part works)    |
| **Milestone**  | M3 (archive growth & major works)                                |
| **Depends on** | 048 (Capital Vol. 1 ingestion), 031 (e-book reader navigation)   |
| **Related**    | 049–052 (Capital renderings), 055 (Manifesto prefaces)           |

## Problem

*Das Kapital*, Volume I is a monumental treatise structured into 8 distinct Parts encompassing 33 chapters, preceded by 5 historical prefaces and afterwords:

1. **Flat Listing of 38 Documents:** When ingested as 38 flat documents in `work.yml`, the table of contents and work page display all prefaces and chapters sequentially without structural grouping.
2. **Missing Parts Hierarchy:** In the original book structure, chapters belong to major logical divisions:
   - **Part I: Commodities and Money** (Chapters 1–3)
   - **Part II: Transformation of Money into Capital** (Chapters 4–6)
   - **Part III: The Production of Absolute Surplus-Value** (Chapters 7–11)
   - **Part IV: Production of Relative Surplus-Value** (Chapters 12–14)
   - **Part V: The Production of Absolute and Relative Surplus-Value** (Chapters 15–18)
   - **Part VI: Wages** (Chapters 19–22)
   - **Part VII: The Process of Accumulation of Capital** (Chapters 23–25)
   - **Part VIII: Primitive Accumulation** (Chapters 26–33)
   Without Part groupings, the theoretical architecture and logical progression of Marx’s critique are obscured.
3. **Front Matter Distinction:** Prefaces/afterwords are front matter and should be visually and functionally segregated from the core body chapters, both on the work overview page and in the reading drawer (`TocDrawer.tsx`).

## Goal

Provide structured support for **Work Parts & Sections** in the schema, data contract, and web reader:

- Support defining or detecting `parts` (e.g. Part I–VIII) for large multi-part works.
- Group chapters under their respective Parts in `WorkPage.tsx` and `TocDrawer.tsx` with collapsible or clean visual dividers.
- Keep front matter (prefaces, afterwords, introductions) cleanly partitioned from the main text.

## Scope & Implementation Details

### 1. Schema & Work Manifest

- Consider adding an optional `parts` mapping or section grouping in `WorkFile` (`work.yml`), e.g.:
  ```yaml
  parts:
    - title: "Part I: Commodities and Money"
      documents: [ch01, ch02, ch03]
    - title: "Part II: Transformation of Money into Capital"
      documents: [ch04, ch05, ch06]
    ...
  ```
- Alternatively, infer Part grouping from the level-4 headings embedded in `source.yml` (e.g. passage `p00001` in `ch01` declares `Part I: Commodities and Money`).

### 2. UI & Navigation (`apps/web`)

- **Work Page (`WorkPage.tsx`):**
  - Render Part headings with section reading time totals.
  - Group chapters under collapsible or styled part blocks.
- **TOC Drawer (`TocDrawer.tsx`):**
  - Display Part headers above chapter clusters in the drawer navigation so readers know where they are in the overall treatise.
- **Passage References (`reference.ts`):**
  - Ensure references (e.g. `Capital I.1`, `Capital 1.1`, `Capital 25.12`) resolve predictably.

### 3. Verification

- `pnpm plm validate`, `pnpm check`, `pnpm e2e`.
