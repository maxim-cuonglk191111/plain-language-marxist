# Task 017 — Deploy pipeline, release artifacts, DEPLOYMENT.md

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 014 |

## Goal
Deploy automatically on merge, with every release recoverable from public artifacts alone (SDD §14).

## Scope
- **Domain and host.** Choose the domain and the static host (open item in SDD §18). The base URL is build configuration, not code.
- **Pipeline on merge to `main`:**
  1. validate
  2. test
  3. build
  4. deploy
  5. publish a release with `site.tar.gz`, `content.tar.gz`, `manifest.json` and `checksums.txt`
- **Secrets.** Kept only in the CI secret store. Building the site needs no secrets.
- **`DEPLOYMENT.md`.** How to clone, build and deploy anywhere, and how to roll back by redeploying an earlier release artifact.
- **Repo `CLAUDE.md`.** Update the ceremony line: from now on a push to `main` deploys, so all work goes through feature branches.

## Acceptance
- A merge to `main` deploys automatically.
- Redeploying an older release artifact restores that version.
- A rebuild on a clean machine, following only DEPLOYMENT.md, succeeds.
