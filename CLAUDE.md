# Plain Language Marxist — repo conventions

These conventions extend `../CLAUDE.md`. Where the two overlap, this file wins.

## Commands

pnpm 9 is pinned via `packageManager`. If a different global pnpm is installed, use `corepack pnpm`.

```bash
pnpm install          # install workspace dependencies
pnpm check            # everything CI runs, stops at the first failure: run before every commit
pnpm plm --help       # run the CLI (TypeScript runs directly via tsx, no build step)
pnpm test             # Vitest, all packages
pnpm lint             # ESLint
pnpm format           # Prettier (write); CI runs `pnpm format:check`
pnpm typecheck        # tsc --noEmit across packages
pnpm plm validate     # content invariants (CI runs this)
pnpm plm build        # validate, then write the static data contract to dist/data/v1/
pnpm build:site       # plm build + static reader export to apps/web/out/
pnpm e2e              # Playwright + axe against a built fixture site (run after web changes)
pnpm plm diff-source --via wayback   # source drift report (never writes)
pnpm plm check-links --site apps/web/out [--external]
python -m http.server 4173 --directory apps/web/out   # preview (serves .htm as HTML)
pnpm plm import <url> --via wayback   # import a source; see config/sources.yml
pnpm plm annotate <document-dir>      # mark vocabulary terms in the original text
pnpm plm prompt <document-dir> --next 15        # Copy-for-LLM prompt
pnpm plm apply <document-dir> <file> --ai|--human  # check and write renderings
pnpm plm review <document-dir>                    # all checks over existing Plain English (hard words, long sentences)
```

**Layout:** library packages in `packages/*` export their TypeScript source directly (`"exports": "./src/index.ts"`). Tests live next to the code as `*.test.ts`.

**MIA access from this machine:** www.marxists.org resolves to ::1 here (Vietnam blocks it), so the fetch guard refuses it. Use `--via wayback`, or set `PLM_PROXY=http://127.0.0.1:<port>` (your VPN client's HTTP proxy) and use `--via direct`.

**New kinds of source page:** follow docs/architecture/parser-guide.md. Run `pnpm plm parse-check <url> --via wayback` first, and read every "Not kept" line.

**Reader:** a static Next.js export. Pages are server-rendered at build time from dist/data/v1, so they work without JavaScript; JS only switches the layers (task 023: data-layers / data-cols on <html>, set before first paint by BOOT_SCRIPT in lib/prefs.ts and lib/layers.ts). Use plain <a> links, never next/link: apps/web/scripts/finalize-export.mjs drops the RSC payloads that client navigation would need, renames ch01.htm.html to ch01.htm, moves other pages to dir/index.html, and copies dist/data/v1 into the site.

**Parser changes:** regenerate the golden files with `UPDATE_GOLDEN=1 pnpm test`, review **both** `*.golden.json` and `*.dropped.txt` diffs (text appearing in .dropped.txt is newly lost), and bump `MiaAdapter.version`.

**TypeScript** is pinned to `~6.0`, because typescript-eslint does not support TypeScript 7 yet.

## Ceremony

- **A push to `main` deploys** (task 017, `.github/workflows/deploy.yml`) once the remote and host secrets exist. Use feature branches and the full flow from `../CLAUDE.md`.
- Deploy setup, host rules and rollback: [DEPLOYMENT.md](DEPLOYMENT.md). Both Cloudflare Pages (`apps/web/public/_headers`) and Vercel (`apps/web/public/vercel.json`) are supported; change both together.
- Preview the export as Cloudflare serves it: `pnpm exec wrangler pages dev apps/web/out --port 8788`. On Windows, stopping the terminal can leave `workerd` holding the port, so kill it before restarting.

## Design reference

`docs/architecture/SDD.md` (v1.2) is frozen. If something new comes up:
- content problems (translation, terminology, context) go in explanations or `docs/editorial/`;
- technical problems become a new task in `docs/tasks/`.

Change the SDD only when the design actually fails, and say so in the commit.

## Repo-specific review points

- **Never edit `source.yml` by hand.** Only `plm import` or an approved source update writes it. The original text is immutable (SDD §17, rule 1).
- **Content schemas are persisted shapes.** Any change to a schema bumps `schema_version` and ships with its `plm migrate` step in the same commit.
- **Keep the layers separate.** No commentary or definitions inside Plain English (SDD §8.6). No interpretation inside the original.
- **Copyright.** Never commit copyrighted modern versions of texts (e.g. commercial "plain English" editions), and never use them as fixtures or prompt examples.
- **No attribution trailers** in commits or PRs.
