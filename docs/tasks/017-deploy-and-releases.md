# Task 017 — Deploy pipeline, release artifacts, DEPLOYMENT.md

| | |
|---|---|
| **Status** | Blocked |
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

## What was done (2026-10-04)
- **Hosts: both Cloudflare Pages and Vercel** (maintainer's decision). The domain is still open (SDD §18) and is set through the `PLM_SITE_URL` repository variable.
- **`.github/workflows/deploy.yml`:**
  - validate, test, build, then deploy to each host whose token is configured;
  - production on push to `main`, previews on PRs;
  - on `main`, also publishes a GitHub release.
- **Host config:**
  - `apps/web/public/_headers` (Cloudflare) and `apps/web/public/vercel.json` (Vercel) set the same rules: security headers, an immutable cache for `/_next/static`, a 5-minute cache and CORS for `/data`, and HTML for `.htm`. `vercel.json` also turns on `trailingSlash`.
  - Verified with `wrangler pages dev`: every header applied; `/vocabulary` → 308 `/vocabulary/`; `ch01.htm` served as HTML; unknown paths → 404.
- **`scripts/release.mjs`:** packs `site.tar.gz`, `content.tar.gz`, `manifest.json` and `checksums.txt` into `release/`. The release name comes from the commit (`2026.10.04-59b0286`). Checksums verified with `sha256sum -c`.
- **Fix:** an unset `PLM_SITE_URL` (Actions passes `""`) crashed the build in `new URL("")`; it now falls back to localhost.
- `DEPLOYMENT.md` written; repo `CLAUDE.md` ceremony switched to feature branches.

## Acceptance checked locally
- **Clean rebuild from DEPLOYMENT.md only.** A fresh `git clone` followed by the documented steps (install, `plm validate`, `PLM_SITE_URL=… build:site`, `release.mjs`) succeeded. The base URL appears in the canonical links.
- **Rollback from an artifact.** I downloaded the release files, verified `checksums.txt`, unpacked `site.tar.gz` into an empty folder and served it with `wrangler pages dev`. It served the expected release (`manifest.json` release `2026.10.04-3b32ceb`), the Ch. I text, and the same headers and redirects.

## Not verified (needs the maintainer)
- **The real deploys.** They need a GitHub remote, a Cloudflare Pages project and/or a Vercel project, and the secrets listed in DEPLOYMENT.md. Until then the first two acceptance points cannot be checked against a real host.
- **The `vercel.json` rules.** Checked only against Vercel's docs; there is no local Vercel run.
