# Task 013 — plm build: static data contract v1

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 004, 010 |

## Goal
Generate `/data/v1/` from the content files. These JSON files are the public read API (SDD §10.2).

## Scope
- **Output files:**
  - `index.json`
  - `documents/{source-path}.json`
  - `terms/{slug}.json`
  - `manifest.json`: release ID, content commit, schema versions, counts, checksums
- **Each document JSON contains:**
  - passages, with their layout markup;
  - renderings, both as raw tokens and as text resolved to the default terms;
  - stale flags and revisions;
  - annotations on the original;
  - explanations.
- **Contract schemas.** Zod schemas for the static data go in `packages/schema`. Outside clients depend on this format, so it is versioned (`v1`) and changes follow the persisted-shape rule.
- **Determinism.** The same commit produces byte-identical output. A test builds twice and compares the results.
- **Validation gate.** The build fails if `plm validate` fails.

## Acceptance
- The output validates against the contract schemas.
- The determinism test passes.
