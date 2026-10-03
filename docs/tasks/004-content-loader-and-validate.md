# Task 004 — Content loader and plm validate

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M0 |
| **Depends on** | 003 |

## Goal
`plm validate` enforces every content invariant and exits non-zero on failure. CI and the bot publisher rely on it as their gate (SDD §5, §8.5).

## Scope
- **Loader** (`packages/content`): loads a work tree into typed objects. Errors report the file path, and the line where possible.
- **Invariants**:
  - Every file matches its schema.
  - Passage IDs are unique, are never reused, and tombstones are respected.
  - Each rendering covers a contiguous range of active passages.
  - Each passage has at most one rendering per language.
  - `based_on` matches the covered source hashes. A mismatch marks the rendering **stale**, which is a warning, not an error.
  - Every `original-terms` match exists at the stated occurrence.
  - Term tokens reference known terms and forms. This check arrives with task 010; leave a hook for it until then.
  - The work's rights status is publishable.
  - Internal links resolve.
  - Passage text uses only allowlisted layout markup.
- **Writer**: deterministic output with stable key order and formatting, so diffs stay minimal. `plm import` and `plm apply` both use it.
- **Output**: a human-readable report by default, and `--json` for tools.

## Acceptance
- A fixture work passes.
- For each invariant, a fixture that breaks it fails with a clear message.
- The writer round-trips: load → write reproduces the file byte for byte.

## Notes (on completion)
- Passage-ID reuse is checked within a file (duplicates) and through tombstones (a tombstoned passage can't be covered or annotated). An ID that is **deleted outright** and later reassigned can only be caught by comparing against Git history. That belongs with `plm import` (task 008), which must never drop a passage and must tombstone it instead.
- Term-token checks plug in through `ValidateOptions.checkRenderingText` (task 010).
- External links are not checked here; that is the scheduled link check (task 018).
