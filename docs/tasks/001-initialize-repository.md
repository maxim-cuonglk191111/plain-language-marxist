# Task 001 — Initialize repository and retire SDD v1.0

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M0 |
| **Depends on** | — |

## Goal
Turn the folder into a Git repository with the baseline files every later task assumes.

## Scope
- `git init` with default branch `main`.
- `.gitignore` covering Node, `.env*`, build output and OS files.
- `.gitattributes` forcing LF line endings for `*.yml`, `*.md` and `*.ts`.
- Retire the root `SDD.md` (v1.0) in two commits: commit it as-is, then delete it. That way Git history keeps v1.0, and `docs/architecture/SDD.md` v1.2 replaces it.
- Licensing files (SDD §5.6, D9):
  - `LICENSE`: AGPL-3.0, for code.
  - `LICENSE-CONTENT`: CC BY-SA 4.0, for `content/`.
  - `LICENSING.md`: explains which license applies where.
- `README.md`: what PLM is (the three layers), project status, and links to the SDD and the tasks.
- A repo `CLAUDE.md` with:
  - run and build commands (placeholders until task 002);
  - the ceremony line: direct commits to `main` are fine until the deploy in task 017, and the full flow applies after it;
  - repo-specific review points: no edits to `source.yml` outside import tasks, and the persisted-shape rule for content schemas.

## Acceptance
- `git log` shows SDD v1.0 committed and then removed.
- The licenses and README are present, and the README links resolve.
