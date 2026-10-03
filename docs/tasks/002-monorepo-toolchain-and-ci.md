# Task 002 — Monorepo toolchain and CI skeleton

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M0 |
| **Depends on** | 001 |

## Goal
A working TypeScript monorepo that later packages plug into (SDD §4.2, §4.3).

## Scope
- pnpm workspace with Node LTS pinned (`.nvmrc` / `packageManager`) and a shared strict `tsconfig`.
- Empty packages wired up: `packages/{schema,content,parser,terms,checks,cli}` and `apps/web`.
- ESLint, Prettier, and Vitest at the workspace root, with one sample test.
- A `plm` bin entry in `packages/cli` that prints `--help`.
- GitHub Actions running install → lint → typecheck → test on PRs and on `main`. Steps call pnpm scripts only, so any CI can run them (SDD §4.2).
- Renovate config, plus `pnpm audit` in CI (SDD §13).
- Update the repo `CLAUDE.md` with the real commands.

## Acceptance
- On a fresh clone, `pnpm install && pnpm test && pnpm plm --help` works.
- CI is green on a PR.
