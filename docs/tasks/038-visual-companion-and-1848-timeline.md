# Task 038 — Visual Study Companion and 1848 Revolutionary Timeline (Mermaid)

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-05 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 / Polish |
| **Depends on** | 023, 029, 030 |

## Problem
Readers studying the Manifesto — especially Chapter III (Critique of Socialist and Communist Literature) and Chapter IV (Tactical Alliances in 1848 Europe) — face a dense web of 19th-century political factions, rival socialist schools, and simultaneous uprisings across France, Germany, Poland, Switzerland, and the UK.
Pure prose explanations in the Context layer are helpful, but readers lack a bird's-eye visual diagram mapping these relations and a chronological timeline of the 1848 revolutionary wave.

## Proposed Solution
Introduce an interactive **Visual Study Companion** (via a floating sidebar drawer or dedicated `/archive/.../overview` companion view) powered by client-rendered Mermaid diagrams and accessible data tables.

### 1. Conceptual Diagrams to Build
- **Chapter III Socialist Schools Taxonomy (Flowchart):**
  A structural diagram classifying the schools Marx critiques:
  - *Reactionary Socialism* (looking backward): Feudal Aristocracy, Petty-Bourgeois (Sismondi), German/True Socialism.
  - *Bourgeois / Conservative Socialism* (preserving capitalism): Proudhon, philanthropic reformers.
  - *Critical-Utopian Socialism* (fanciful blueprints): Saint-Simon, Fourier, Robert Owen.
  - *Scientific Communism* (materialist class struggle): Workers' self-emancipation.
- **Chapter IV & 1848 Timeline:**
  A chronological timeline illustrating the simultaneous European uprisings:
  - 1846: Cracow Insurrection (Poland).
  - Jan 1848: Palermo Uprising (Italy).
  - Feb 1848: Manifesto published in London; February Revolution overthrows July Monarchy in Paris.
  - Mar 1848: March Revolutions in Berlin and Vienna; uprisings in Milan, Venice, Budapest.
  - Apr 1848: Chartist rally on Kennington Common (London).
  - Jun 1848: June Days uprising of Parisian workers.

### 2. Mermaid Implementation Guidelines & Syntax Rules
To prevent rendering failures and ensure cross-theme compatibility:
- **Strict Node Quoting:** All node labels containing punctuation, parentheses, brackets, or colons must be enclosed in double quotes:
  ```mermaid
  graph TD
    A["Feudal Socialism"] --> B["Reactionary Critique (Aristocratic)"]
  ```
- **No Raw HTML in Labels:** Do not use `<br>` or `<b>` inside node strings; use clean text or standard markdown strings.
- **Theme Synchronization:** Initialize Mermaid dynamically based on `document.documentElement.dataset.theme`:
  ```ts
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "neutral",
    securityLevel: "loose",
  });
  ```
- **Accessibility Fallback:** Every diagram must have an accompanying `<details>` section containing a semantic HTML table or bulleted outline representing the same data, ensuring 100% WCAG / axe-core compliance.

### 3. UI Placement
- Provide a persistent floating button or reader-bar icon **`Visual Map & Timeline`** on desktop and mobile.
- Clicking opens a slide-over drawer or modal that loads Mermaid dynamically (`next/dynamic` with `ssr: false`).

## Acceptance
- Mermaid diagrams render cleanly without syntax errors on both light and dark themes.
- Accessible text alternatives pass Playwright axe-core audits.
- Readers can open and close the visual companion without disrupting their reading position.
