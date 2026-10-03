# Task 018 — Source drift and link-check scheduled jobs

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 008, 017 |

## Goal
Detect changes to source texts and broken links, with no server required (SDD §7.4, §14.2).

## Scope
- **`plm diff-source [work]`**
  - Re-fetches each source document.
  - Classifies it as `UNCHANGED`, `FORMATTING_CHANGED`, `TEXT_CHANGED`, `STRUCTURE_CHANGED` or `UNAVAILABLE`.
  - Shows a passage-level diff for changed documents.
- **Weekly drift job.** A GitHub Action runs `plm diff-source`. On any change it opens an issue, or updates the existing one. It never modifies content.
- **Weekly link check.** Covers links in the built site and the source URLs.

## Acceptance
- A test with a modified fixture reports `TEXT_CHANGED` and the correct diff.
- In a dry run, the drift Action opens an issue.
