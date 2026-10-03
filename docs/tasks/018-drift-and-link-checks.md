# Task 018 — Source drift and link-check scheduled jobs

| | |
|---|---|
| **Status** | Done |
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

## Notes (on completion)
- **`plm diff-source`** re-fetches each document (direct, with Wayback fallback or `--via wayback`), parses it and compares it with `source.yml` without writing anything:
  - identical bytes give `UNCHANGED`;
  - same passage text gives `FORMATTING_CHANGED`;
  - changed text with the same block shape gives `TEXT_CHANGED`;
  - added or removed blocks give `STRUCTURE_CHANGED`;
  - a failed fetch gives `UNAVAILABLE`.
  It lists passage-level changes, writes a Markdown report with `--report`, and sets `changed=N` in `GITHUB_OUTPUT`.
- **`plm check-links`** checks every link in the built site. Internal links must point to a page a static host would serve and to an existing `#id`. `http://` links are flagged. External links are fetched with `--external`, through the safe fetcher.
- `.github/workflows/scheduled.yml` runs both every Monday and on demand, and opens or updates an issue labelled `source-drift` or `broken-links`.
- **Verified locally:**
  - unit tests cover all five drift states and every link-check case;
  - a real `plm diff-source --via wayback` reports Ch. I as UNCHANGED;
  - a real `plm check-links` checked 168 links and found 0 broken.
- **Not verified yet:** the workflow itself (dry run). The repository has no GitHub remote; trigger it with `workflow_dispatch` once it is pushed.
