# Task 021 — Parser hardening: independent loss detection, broad survey, proxy

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 008 |

## Goal
The maintainer found that the MIA parser produced many hidden errors. Make sure future page types fail loudly instead of corrupting content, write down how to handle them, and allow fetching marxists.org through a VPN (it is blocked in Vietnam).

## Root cause
- The golden files were created from the parser's own output, so text lost at the start was recorded as correct.
- The parser silently dropped anything it did not recognise.
- The first survey covered only 8 pages, while MIA's markup varies by section and era.

## What was done
- **Independent missing-text check** (`missingText`). It compares the raw page's words with the output and lists every run of words that did not make it, without relying on the parser's rules. It is shown by `plm parse-check` and `plm import`, and recorded per fixture in `*.dropped.txt` goldens, so any newly dropped text appears in review.
- **Parse checks** (`inspectDocument`). They flag:
  - error pages (MIA's 404 page, Wayback's own pages);
  - pages with no body text;
  - empty passages and footnote references with no note;
  - leftover HTML;
  - navigation or credits in the text;
  - merged paragraphs.

  Errors stop `plm import` unless `--force` is passed.
- **`plm parse-check <url> [--via wayback] [--save-fixture name]`** inspects any page without writing content.
- **Survey of 30 pages** across Marx/Engels, *Capital*, Lenin, Luxemburg, Trotsky, letters and the IWMA. It found and fixed:
  - `p.next` and single-link "Next:" paragraphs, and link-only navigation tables;
  - tables inside notes (quirks-mode `<table>` in `<p>`, or right after a note's number);
  - note bodies in indented or quoted paragraphs;
  - plain-numbered notes ("2. Compare…");
  - links wrapping the `<sup>`;
  - Lenin Collected Works markup: sidebar notes, `fw…E` editorial endnotes, notes signed "—Ed.", and MIA's moved-note boilerplate;
  - "Notes" headings;
  - `<pre>`;
  - an undercount of editorial notes (references and back-links had both been counted);
  - unrecognised elements, now reported instead of being silently flattened.
- **Content recovered in existing fixtures:** two tables in *Capital* ch. 25, figures in a note in *Socialism: Utopian and Scientific*, and two plain-numbered notes. All golden diffs were reviewed.
- **Proxy support.** Setting `PLM_PROXY=http://host:port` tunnels HTTPS through HTTP CONNECT; TLS stays end to end, and DNS is resolved at the proxy. This was verified live through a local CONNECT proxy to the Wayback Machine (byte-identical page). It also fixed the Host header, which made Wayback redirect to `:80`.
- **Repo-wide test for invisible control characters**, after shell escaping twice turned a `\b` in a regex into a backspace.
- `docs/architecture/parser-guide.md` describes the workflow and catalogues the known patterns.

## Not verified
- **Fetching marxists.org through the maintainer's VPN.** This needs the VPN client's HTTP proxy port. Then run:
  ```bash
  PLM_PROXY=http://127.0.0.1:<port> pnpm plm diff-source --via direct
  ```
  This compares the live site with the Wayback-imported Ch. I.
