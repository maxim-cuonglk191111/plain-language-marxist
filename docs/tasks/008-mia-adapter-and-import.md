# Task 008 — MIA source adapter and plm import

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 004, 007 |

## Goal
Turn an MIA URL into a `source.yml`, a snapshot and a `work.yml` stub (SDD §7).

## Scope

**Adapter**
- A `SourceAdapter` interface and a `MiaAdapter` built on parse5/cheerio.
- It is deterministic: the same snapshot always gives the same output.

**Fetch safety**
- Only allowlisted hosts (`config/sources.yml`), and only HTTPS.
- Block loopback, private and link-local addresses (IPv4 and IPv6), checked after DNS resolution.
- Re-validate every redirect hop.
- Cap response size and fetch time.

**Normalization**
- Strip site chrome and source anchors/IDs.
- Keep the layout as layout markup: headings, paragraphs, lists, quotes, line breaks, indentation, emphasis, footnotes and links.
- Hash the normalized text.

**`plm import <url>`**
- Prints a report (detected title and body, block count, warnings) and asks for confirmation. `--yes` skips the prompt for CI.
- Writes `source.yml` with sequential passage IDs, a snapshot under `ingestion/snapshots/`, and a `work.yml` stub.
- Refuses to publish until the rights fields are filled in.

**Tests**
- Golden tests for every fixture from task 007.

## Acceptance
- All golden tests pass.
- Importing the *Manifesto* Ch. I fixture gives files that pass `plm validate`, apart from the rights check.
- SSRF unit tests cover private IPs, redirects to private IPs, and non-HTTPS schemes.
