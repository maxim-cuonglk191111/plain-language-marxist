# Deployment

The site is a fully static export: HTML, JS and the `data/v1` JSON. It runs on any static host without a server or database, and building it needs no secrets. Cloudflare Pages and Vercel are both supported and configured in the repo. Other hosts work too, but you have to recreate the headers and the trailing-slash rule (see below).

## Build from a clean machine

Requirements: Node (the version in `.nvmrc`), corepack (ships with Node), and git.

```bash
git clone <repo-url> plain-language-marxist
cd plain-language-marxist
corepack enable            # or prefix every pnpm command with `corepack`
pnpm install --frozen-lockfile
pnpm plm validate          # content is consistent
PLM_SITE_URL=https://example.org pnpm build:site
```

The output is in `apps/web/out/`; the data contract is also in `dist/data/v1/`. `PLM_SITE_URL` is the public base URL used for absolute links and metadata. It defaults to `http://localhost:3000`.

To preview locally the way Cloudflare serves it:

```bash
pnpm exec wrangler pages dev apps/web/out --port 8788
```

## Automatic deploys (`.github/workflows/deploy.yml`)

| Event | Result |
|---|---|
| Push to `main` | Validate, test, build, deploy to production, publish a GitHub release |
| Pull request from this repo | Validate, test, build, deploy a preview (fork PRs get no secrets, so they skip the deploy) |
| Manual run | Same as a pull request, for the selected ref |

A host is skipped when its token is not configured, so you can run one host or both.

### Cloudflare Pages

1. Create a Pages project with **Direct Upload** (no Git integration; CI uploads the built folder). Run this once, from an **empty directory** outside the repo:
   ```bash
   npx wrangler pages project create plain-language-marxist --production-branch main --force
   ```
   Since Wrangler 4.14x, `pages project create` without `--force` silently creates a *Worker* and uploads whatever static folder it auto-detects in the current directory. At the repo root it refuses to run ("workspace root"). Once the project exists, `wrangler pages deploy` targets Pages normally and works from the repo root, so CI needs no `--force`.
2. Create an API token with the **Cloudflare Pages: Edit** permission.
3. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. If the project has a different name, set repository variable `CF_PAGES_PROJECT`.

Pushes to `main` go to production; other branches become preview deployments at `<branch>.<project>.pages.dev`. Headers come from `apps/web/public/_headers`.

### Vercel

1. Create a project with Framework Preset **Other**, no build command, and output directory `.`. CI uploads the already-built folder, so Vercel never builds anything.
2. Run `vercel link` once locally to get the org and project IDs (in `.vercel/project.json`; never commit it).
3. Add repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

Pushes to `main` deploy with `--prod`; everything else is a preview. Headers and `trailingSlash` come from `apps/web/public/vercel.json`, which the export copies to the root of the uploaded folder.

### Repository variables

| Name | Purpose |
|---|---|
| `PLM_SITE_URL` | Public base URL, e.g. `https://example.org` (domain still to be chosen, SDD §18) |
| `CF_PAGES_PROJECT` | Cloudflare Pages project name (default `plain-language-marxist`) |

Secrets live only in the GitHub secret store, never in the repo.

## What any host must do

Both host configs encode these rules. On another host, set them up yourself:

- **Trailing slashes.** Pages are exported as `dir/index.html`. Redirect `/x` to `/x/` for paths without an extension.
- **`.htm` reader pages.** Paths such as `/archive/.../ch01.htm` mirror marxists.org URLs and are HTML files. Serve them as `text/html; charset=utf-8`.
- **404.** Serve `404.html` for unknown paths.
- **Caching.** `/_next/static/*` is content-hashed, so cache it for a year with `immutable`. `/data/*` changes on every release, so keep its cache short (5 minutes).
- **CORS.** `/data/*` is a public API, so send `Access-Control-Allow-Origin: *`.

## Releases and rollback

Every push to `main` publishes a GitHub release named after the build (`YYYY.MM.DD-<commit>`, taken from the commit, not the clock). It contains:

| File | Contents |
|---|---|
| `site.tar.gz` | The built site (`apps/web/out`), ready to upload as-is |
| `content.tar.gz` | `content/`, `governance.yml` and the content licences: everything needed to rebuild |
| `manifest.json` | The data manifest, with a checksum for every data file |
| `checksums.txt` | SHA-256 checksums of the three files above |

You can build the same files locally after `pnpm build:site` with `node scripts/release.mjs`, which writes them to `release/`.

**To roll back**, redeploy an older release:

```bash
gh release download <release> --pattern 'site.tar.gz' --pattern 'checksums.txt'
sha256sum -c checksums.txt --ignore-missing
mkdir site && tar -xzf site.tar.gz -C site
pnpm exec wrangler pages deploy site --project-name=plain-language-marxist --branch=main
# or: vercel deploy site --prod
```

Both dashboards also offer a one-click rollback to a previous deployment. Use the release artifact when the host account is gone or you are moving to a new host.

## Troubleshooting

- **Windows: `wrangler pages dev` serves stale files or ignores `_headers`.** An earlier dev server's `workerd` process can outlive its terminal and keep the port. Stop all `workerd` processes and start again.
