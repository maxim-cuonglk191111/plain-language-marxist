# Task 009 — Import Communist Manifesto Chapter I

| | |
|---|---|
| **Status** | Blocked |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 006, 008 |

## Goal
Get the first real content into the repository.

## Scope
- Run `plm import` on Ch. I.
- Fill in `work.yml`:
  - authors and year;
  - translation: Samuel Moore, 1888;
  - rights: `PUBLIC_DOMAIN`, with notes on why, plus `verified_by` / `verified_at`;
  - document order: ch01 only for now.
- Compare the Original layout with MIA block by block. Record any discrepancies as parser bugs.
- Commit message: `source(manifesto/ch01): import from MIA`.

## Acceptance
- `plm validate` passes.
- The layout comparison is complete, and its notes are attached to the PR.

## Progress
- Imported on branch `task/009-import-manifesto-ch01` with `plm import … --via wayback`, from the Wayback snapshot of 2026-09-30. The result is 65 passages (2 headings, 59 paragraphs, 4 footnotes) and a byte-exact snapshot.
- **Layout comparison** was done with an independent check that does not use the parser: the 61 text blocks extracted with a regex from the snapshot match the passages one for one. The only two differences are whitespace artifacts of the checker itself. Footnotes 1–4 are intact, including multi-paragraph notes and Engels's edition attributions. The `[lumpenproletariat]` editorial insertion is kept. MIA's typo "manufacturer" is kept as in the source, to be handled by a translation note.
- `work.yml` is filled in (title, authors, Moore 1888 translation), with the rights research in `rights.notes`.
- **Blocked on:** the maintainer verifying the rights. Set `status: PUBLIC_DOMAIN`, `verified_by` and `verified_at`, then merge.
- The document title comes from the page ("Communist Manifesto (Chapter 1)"). `source.yml` is import-only, so changing the title would mean adding a `--title` option to `plm import` (small follow-up).
