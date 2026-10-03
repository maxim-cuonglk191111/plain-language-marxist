# Task 014 — Web reader: routes, modes, layout rendering

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 013 |

## Goal
The core reading experience, as a fully static Next.js export (SDD §10.1, §12).

## Scope

**Routing**
- Routes mirror the source paths: `/archive/{…}/{document}.htm`.
- Verify early that the chosen static host serves `.htm` paths as HTML. If it doesn't, add a rename step (SDD §18).

**Rendering**
- Render the layout markup faithfully to the original layout. Never inject raw HTML.

**Reading modes**
- Original, Plain English and Parallel.
- In Parallel, scrolling stays in sync passage by passage. A rendering that covers several passages lines up with the whole group.
- `?view=` stores the current mode as client state. The canonical link is the bare path.

**Deep links**
- `#p00017` works in every mode.
- In Plain English, the link scrolls to the rendering that covers the passage and highlights it.

**States and labelling**
- Missing rendering: show "Plain English not yet available". The contribute link stays disabled until M2.
- Stale rendering: show a warning.
- Each layer gets its own typography and label.
- Every page has a "View original source" link and MIA attribution.

**No-JS support**
- Pre-render the text with default terms so pages work without JavaScript.

## Acceptance
- Ch. I renders in all three modes.
- Deep links work.
- Original and Plain English work with JavaScript disabled.
- Lighthouse LCP is under 2.5 s on the deployed preview.
