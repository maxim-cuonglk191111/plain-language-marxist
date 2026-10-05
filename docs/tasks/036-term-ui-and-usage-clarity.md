# Task 036 — Term UI and Usage Count Clarity

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-05 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 / Polish |
| **Depends on** | 010, 015 |

## Problem
1. **Confusing "Community Usage" label:** In the term cards, the radio group is titled `Alternatives (community usage)` with items showing `· X uses`. Readers reasonably infer that this measures community upvotes or telemetry. In reality, it is purely the count of published tokens across the corpus that resolve to that rendering by default (`packages/terms/src/index.ts` `usageCounts`).
2. **Internal sounding labels:** The reader bar and cards use `Project wording` and `(project default)`. This feels like an internal engineering label rather than an intuitive reading mode.
3. **No Reset or Privacy disclosure:** Readers who override terms locally in `localStorage` have no obvious "Reset to default" button for single terms or all terms, and there is no note confirming that their reading choices are strictly local with zero telemetry.

## Scope
1. **User-facing wording:**
   - Reader bar toggle: change `Project wording` to `Default (Plain)`, and `Original terms` to `Original (1848)` (or general `Original`).
   - Term card alternative list: change `(project default)` to `(default)`.
   - Term card fieldset legend: change `Alternatives (community usage)` to `Alternative wordings (in-text occurrences)`.
   - Term card item suffix: change `X uses` to `appears X times in texts`.
2. **Reset control:**
   - In `TermCardBody`, if a term currently has an active custom override in `prefs.perTerm`, provide a small `Reset to default` action link.
   - In Reader Settings, provide a `Reset all terminology preferences` button.
3. **Privacy assurance:**
   - Add a brief helper note in settings or card footer: *"Choices are saved locally in your browser. No reading choices or votes are sent to any server."*

## Acceptance
- The reader bar and term cards display clear, non-bureaucratic labels.
- The term card clearly distinguishes text frequency from user community voting.
- Resetting a customized term restores the default rendering immediately.
- `pnpm check` and `pnpm e2e` pass with updated selectors.
