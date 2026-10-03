# Plain Language Marxist — System Design Document

| | |
|---|---|
| **Version** | 1.2 |
| **Status** | Draft — under review |
| **Date** | 2026-10-03 |
| **Supersedes** | `SDD.md` v1.0 (removed from the repo root; kept in Git history, commit 28ab4cc) |

---

## 1. Overview

Plain Language Marxist (PLM) is an open-source platform for reading historical Marxist texts in three strictly separated layers:

| Layer | Content | Rule |
|---|---|---|
| **Original** | Source text as published/transcribed | Never modified by the platform |
| **Plain English** | Modern rendering of vocabulary and syntax | A reading aid, not a replacement. Changes the wording, never the argument |
| **Explanation** | Context, terminology, historical notes, commentary | May interpret, and is always labelled as interpretation |

### 1.1 Principles

1. **Preserve the source.** Original text is immutable. Only an approved source update can change it.
2. **Separate the layers.** The original, the passage identity, the rendering, the terminology and the interpretation are separate data with explicit links. Each layer lives in its own file.
3. **Make interpretation visible.** Every wording choice and every explanation can be attributed, reviewed and reverted.
4. **Git is the published ledger.** Everything a reader sees is built from the repository. Databases hold only work in progress.
5. **Static first.** Reading needs no server, database or account. Community features are an add-on that can fail without taking reading down.
6. **Survivable.** No host, provider, database or person is a single point of failure.

### 1.2 Non-goals

PLM is not a social network, a public discussion forum, a wiki, a political organization, an AI interpreter or a ranking engine for ideology. Multiple traditions are represented by labelled collections and reading paths, never by hidden ranking.

---

## 2. Decision Record (v1.2)

These decisions resolve the contradictions in v1.0. The rest of this document is written to be consistent with them.

| # | Decision | Rationale |
|---|---|---|
| D1 | The name is **Plain Language Marxist**. The CLI is `plm` | Matches the repository name. The domain is configuration (§10.4) |
| D2 | **Static-first architecture.** A content build produces a static site and static JSON data. A small community service (API + DB) handles contributions only | Cheapest to bootstrap and host. It works with no backend, makes the static export the product itself (so the "static vs API" conflict disappears) and serves as its own mirror package |
| D2a | **TypeScript across the whole stack**: web, CLI, parser and community API | A bootstrap project with one language and one set of schemas, shared by CLI, web and server, has less to maintain. This replaces the v1.0 split between FastAPI and Next.js |
| D3 | **Review happens in the app and is open to the community**, with approval thresholds kept in `governance.yml` in the repo. Approved changes are published to Git automatically by a bot | Contributors review in a proofreading UI rather than on GitHub. Git stays the ledger, and the thresholds can grow as the community grows |
| D4 | **Passages mirror source blocks 1:1. Renderings attach to a contiguous range of passages and may contain any number of output paragraphs** | One model covers all three cases: a long paragraph rendered as several short ones, a 1:1 rendering, and several short paragraphs rendered as one. Passages never split or merge for editorial reasons |
| D5 | **The source block (paragraph) is the alignment unit.** Uneven lengths are handled by D4. Source anchors are discarded after import. PLM keeps the original layout but uses only its own internal structure (§5.3) | Source anchors (MIA's line markers) don't line up with paragraphs and tie PLM to one site's markup. Paragraphs are the natural unit for reviewing and citing. Sentence-level alignment is too fragile to maintain |
| D6 | **Terms in Plain English are tokens resolved at display time.** Readers can switch terminology in the UI. The original is never touched. Plain English text changes only through reviewed contributions | Tokens give consistent terminology across works, a term preference for each reader, and global decisions without find/replace. Each token is placed deliberately by an author, so no string matching is involved |
| D7 | **One file per layer per document** (`source.yml`, `en-plain.yml`, `original-terms.yml`, `explanations.yml`). Renderings are a map keyed by passage ID | Contributions never touch the source file, so the integrity check is simple. A new language is a new file. Keyed maps produce few Git conflicts. Files stay plain YAML that any tool can read |
| D8 | **No server-side AI.** The editor offers a "Copy for LLM" prompt and a "Paste result" importer with strict structural checks. Contributors use any LLM themselves and must declare that they did | No API costs, no key handling and no dependence on a provider, and every contribution goes through the same safeguards. A bring-your-own-key option that runs only in the browser may come later (M6) |
| D9 | **Licenses:** renderings and explanations are CC BY-SA 4.0. Code is AGPL-3.0 | CC BY-SA is compatible with MIA's own CC BY-SA material |

---

## 3. Glossary

| Term | Definition |
|---|---|
| **Passage** | One source block (paragraph, heading, blockquote, list item, footnote…) with a stable internal ID such as `p00017` |
| **Rendering** | A modernized text for a contiguous range of passages in one language and register (`en-plain`) |
| **Term token** | A marker in rendering text, such as `{bourgeoisie}`, that is resolved to the chosen wording when the page is displayed |
| **Contribution** | A proposed change that is reviewed in the app before it is published to Git |
| **Content build** | `plm build`: validates the content and emits the static site data |

---

## 4. Architecture

### 4.1 Component view

```text
 MIA ──(plm import, allowlisted)──► Git content repo ◄──── bot PRs ───┐
                                         │                             │
                                   CI: plm validate                    │
                                         │                             │
                                   plm build (on merge)                │
                                         ▼                             │
                     ┌──── Static site + /data/v1/*.json ────┐         │
                     │  (any static host / CDN / mirror)     │         │
                     └──────┬──────────────────┬─────────────┘         │
                            ▼                  ▼                       │
                      Web reader       Browser extension (M4)          │
                            │                                          │
                            │ sign-in, contribute, review              │
                            ▼                                          │
                   Community service (M2) ── PostgreSQL ───────────────┘
                   (drafts, reviews, roles, audit; publishes via GitHub App)
```

- **Read path:** Git → build → static files. Nothing on this path depends on a server.
- **Write path:** community service → approval → bot PR → CI → merge → rebuild. Contributors who know Git can also open a PR directly, and it passes through the same CI.
- If the community service is down, reading and Git-based contribution keep working. Only in-app contribution stops.

### 4.2 Technology stack

| Concern | Choice |
|---|---|
| Language | TypeScript (Node LTS), one pnpm monorepo |
| Schemas | Zod as the single source. JSON Schema is exported for external tools |
| Web | Next.js, static export (`output: 'export'`) |
| Search | Pagefind (a static index generated at build time) |
| CLI | `plm` (Node) |
| HTML parsing | parse5 / cheerio |
| Community API (M2) | Hono on Node. It is portable to other runtimes |
| Database (M2) | PostgreSQL with Drizzle ORM and committed migrations |
| Auth (M2) | GitHub OAuth. The GitHub identity is also used as the commit author |
| CI/CD | GitHub Actions. The steps are plain `plm` commands, so another CI can run them |
| Tests | Vitest, Playwright |
| Local dev | `pnpm dev` runs the reader with no services. `docker compose up` adds the API and Postgres (M2) |

**Excluded:** Kubernetes, microservices, Redis, queues, Elasticsearch, GraphQL and server-side AI.

### 4.3 Repository layout

```text
apps/web/                  Next.js reader + contributor UI
apps/api/                  community service (M2)
packages/schema/           Zod schemas (content, static data contract, API)
packages/content/          load / validate / write content files
packages/parser/           source adapters (mia/) + fixtures + golden files
packages/terms/            token parser and term resolver
packages/checks/           structural checks shared by CLI, editor and API
packages/cli/              plm
content/works/…            §5.1
content/vocabulary/        one file per term
content/collections/       collections + reading paths
ingestion/snapshots/       raw source HTML per import (all imported works are redistributable, §5.6)
governance.yml             roles + review thresholds (§9)
docs/                      architecture/, editorial/, contribution/, tasks/
```

---

## 5. Content Model

Full field definitions: `packages/schema` (Zod) and `docs/architecture/layout-markup.md`. All content files start with `schema_version`. Any schema change bumps the version and ships with a migration in `plm migrate` in the same commit.

### 5.1 File layout

```text
content/works/marx/1848/communist-manifesto/
├── work.yml                 metadata, rights, document order
└── ch01/
    ├── source.yml           passages (written only by plm import / approved source updates)
    ├── original-terms.yml   term annotations on the original
    ├── en-plain.yml         renderings (language = file name)
    └── explanations.yml     explanations targeting passages
```

### 5.2 Identifiers

| Entity | Format | Example |
|---|---|---|
| Work | `work:{author}:{year}:{slug}` | `work:marx:1848:communist-manifesto` |
| Document | `document:{author}:{year}:{slug}:{doc}` | `document:marx:1848:communist-manifesto:ch01` |
| Passage | `p` + 5 digits, unique within its document | `p00017` |
| Term | `{slug}` | `bourgeoisie` |
| Contribution | `c_` + ULID | `c_01J…` |

**Passage ID rules:**
- Passage IDs are assigned in document order at first import. After that, an ID is **an identity, not a position**: order comes from the order of the list in `source.yml`.
- An ID is never reused. A block removed in an approved source update is **tombstoned**.
- A block added by a source update gets the next free ID. A block that the source itself splits or merges gets new IDs with `derived_from`.
- Passages never split or merge for editorial reasons. That is the job of renderings (§5.4).

### 5.3 `work.yml` and `source.yml`

```yaml
# work.yml
schema_version: 1
id: work:marx:1848:communist-manifesto
title: Manifesto of the Communist Party
authors: [marx, engels]
year: 1848
translation: { translator: Samuel Moore, year: 1888 }
rights:
  status: PUBLIC_DOMAIN      # UNVERIFIED (written by import, not publishable) | PUBLIC_DOMAIN | CC_BY | CC_BY_SA | PERMISSION_GRANTED | BLOCKED
  attribution: Marxists Internet Archive
  notes: "…"
  verified_by: "@maintainer"
  verified_at: 2026-10-03
documents: [ch01, ch02, ch03, ch04]
```

```yaml
# ch01/source.yml
schema_version: 1
document: document:marx:1848:communist-manifesto:ch01
title: Chapter I. Bourgeois and Proletarians
source:
  provider: mia
  url: https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm
  retrieved_at: 2026-10-03
  snapshot: ingestion/snapshots/…/2026-10-03.html
  snapshot_hash: sha256:…
  parser: { name: mia, version: 1.0.0 }
passages:
  - id: p00017
    type: paragraph           # heading (+ level 1–6) | paragraph | blockquote | list_item | footnote (+ label) | table | caption
    text: "The history of all hitherto existing society is the history of class struggles."
    hash: sha256:…            # of normalized text (markup excluded)
    state: active             # active | tombstoned
```

**The internal structure is independent of the source's markup.** After import, PLM uses only its own passage IDs. Source anchors, IDs and other markup tied to the source site (MIA's `#015` line markers, for example) are discarded. The raw snapshot still keeps them for provenance.
- Passage boundaries come from the source's block structure (`<p>`, `<h*>`, `<blockquote>`, `<li>`, …).
- Deep links use PLM's own IDs: `ch01.htm#p00017`.

**Original layout is preserved.** The Original layer must look like the source text, not a re-flowed copy:
- block types and their order;
- line breaks within a block (verse, addresses, letter headings, tables of figures);
- indentation and alignment where they carry meaning;
- emphasis (italic, bold, small caps);
- footnote markers and footnote text;
- links to other works.

Passage `text` stores this with a small allowlisted markup: line breaks, emphasis, small caps, footnote references, links and preserved indentation. Anything else is rejected by the validator. Layout markup is excluded from `hash`, so a pure layout fix doesn't count as a text change.

### 5.4 Renderings (`en-plain.yml`)

```yaml
schema_version: 1
document: document:marx:1848:communist-manifesto:ch01
language: en
register: plain
renderings:
  p00017:                     # key = first covered passage
    covers: [p00017]          # contiguous range of passage IDs, in source order
    based_on: sha256:…        # hash of the covered passages' source hashes
    revision: 3               # incremented on each published change
    ai_assisted: false        # contributor declaration
    text: |
      All history up to now has been the history of class struggles.
  p00031:
    covers: [p00031, p00032]  # two short source paragraphs → one rendering
    based_on: sha256:…
    revision: 1
    ai_assisted: true
    text: |
      The {bourgeoisie} has played a most revolutionary role in history.

      Wherever it has gained power, it has ended all feudal relations.
```

**Alignment rules (D4/D5):**
- A rendering covers 1…n contiguous active passages, and its text may contain 1…m paragraphs separated by blank lines. This handles long paragraphs, short paragraphs and 1:1 cases with the same model.
- Each passage is covered by **at most one** rendering per language. Passages with no rendering show as "not yet available".
- Headings and footnotes are rendered too. They are ordinary passages.
- If the source changes under a rendering, `based_on` no longer matches. The build then marks the rendering **stale**, shows it with a warning and opens a review item. Stale renderings are never deleted or rewritten automatically.
- Only **published** renderings live in Git. Drafts and reviews live in the community service.

### 5.5 Original term annotations (`original-terms.yml`)

```yaml
schema_version: 1
annotations:
  - passage: p00017
    term: bourgeoisie
    match: "bourgeoisie"      # exact substring in passage text
    occurrence: 1             # which occurrence (1-based)
```

These annotations are anchored to text, not to character offsets, so people can edit them in Git. If the source changes and the match no longer exists, the annotation fails validation and goes to review instead of highlighting the wrong word.

### 5.6 Rights

- A work can be imported **only** if its rights status allows redistribution and derivative works: `PUBLIC_DOMAIN`, `CC_BY`, `CC_BY_SA` or `PERMISSION_GRANTED` with the permission recorded.
- Anything else, including unknown rights, is rejected at import. PLM cannot modernize a text it is not allowed to store, so v1.0's partial storage policies are dropped.
- MIA is not assumed to be public domain. A maintainer verifies the rights for each work and records who verified them and when (`verified_by`, `verified_at`).
- Renderings and explanations are CC BY-SA 4.0. Code is AGPL-3.0.
- If rights are withdrawn, the work's status becomes `BLOCKED`. Its content is removed from the build, while its metadata and Git history are kept as the law allows. Removal follows a documented claim, review and decision process, never informal deletion.

### 5.7 Explanations, collections, reading paths

```yaml
# explanations.yml
schema_version: 1
explanations:
  e001:
    kind: historical_context    # explanation | historical_context | interpretation | commentary | translation_note
    targets: [p00017]
    text: "…"
    sources: [{ title: "…", author: "…", year: 1999, url: "…" }]
    ai_assisted: false
```

- Collections are `{id, title, description, documents[], maintainers[]}`.
- Reading paths are `{id, title, items[], rationale}`. They are shown as "suggested", never "correct".
- Traditions such as left communism are collections, not code paths.

---

## 6. Term System (D6)

### 6.1 Term file (`content/vocabulary/bourgeoisie.yml`)

```yaml
schema_version: 1
term: bourgeoisie
original: { sg: bourgeoisie, adj: bourgeois }
definition:
  short: "The class that owns the means of production."
  long: "…"
  sources: […]
renderings:
  capitalist-class:
    forms: { sg: capitalist class, adj: capitalist }
    reason: "Immediately understandable to contemporary readers."
    limitation: "Foregrounds the economic sense more than the historical term."
  bourgeoisie:
    forms: { sg: bourgeoisie, adj: bourgeois }
    reason: "Keeps the original term."
default: capitalist-class
scoped_defaults:
  - scope: work:engels:1880:socialism-utopian-scientific
    rendering: bourgeoisie
```

Every rendering alternative must supply **all** of the forms the term declares, with the same grammatical number. This is what makes swapping safe.

### 6.2 Tokens in rendering text

| Token | Displays |
|---|---|
| `{bourgeoisie}` | `sg` form of the resolved rendering |
| `{bourgeoisie:adj}` | `adj` form |
| `{Bourgeoisie}` | Same, with the first letter capitalized |
| `{bourgeoisie=bourgeoisie}` | Pins this occurrence to one rendering (a passage-level decision) |
| `\{` | A literal brace |

To keep a specific wording outside the term system, the author writes plain words instead of a token.

### 6.3 Resolution

For each token, the first match wins:
1. a pin on the occurrence;
2. the reader's local preference ("original terms", or a chosen alternative);
3. a work or author scoped default;
4. the global `default`.

The original text never changes. Swapping changes only what is displayed.

### 6.4 Consequences

- Changing a global or scoped default changes what every affected passage displays. It is therefore a high-impact contribution. The review UI shows the number of affected passages and a preview, and the change needs the stricter approval rule (§9.2).
- The editor finds known renderings and aliases in new text and offers to turn them into tokens. Contributors confirm each conversion; nothing is converted silently.
- **Usage count** is the number of published tokens that display a given rendering by default. It is labelled "community usage" and never ranks alternatives as correct.
- Tokens are highlighted in Plain English. In the Original, annotations (§5.5) are highlighted. Both open the same term card.

---

## 7. Source Ingestion

### 7.1 Flow

```text
plm import <url>
  → allowlist + SSRF check → fetch → adapter.parse → strip site chrome
  → blocks + layout + metadata → normalize → hash → report (block count, detected body, warnings)
  → maintainer confirms → writes source.yml + snapshot + work.yml stub (rights must be filled in)
```

- In M1 a maintainer runs this through the CLI.
- In M3 the community service exposes the same code as a "new work" contribution that only maintainers can approve, because rights must be checked.
- Contributors never paste source text.

### 7.2 Adapters

```ts
interface SourceAdapter {
  canHandle(url: URL): boolean;
  fetch(url: URL): Promise<RawSource>;
  parse(raw: RawSource): NormalizedDocument;   // deterministic: same snapshot → same output
}
```

`MiaAdapter` is built in M1. `LocalFileAdapter` and `ArchiveOrgAdapter` come later. Each adapter has fixture HTML and golden output files.

### 7.3 Normalization and safety

- **Remove:** navigation, site chrome, tracking and unrelated footers.
- **Keep (layout):** headings, paragraphs, lists, quotations, line breaks within blocks, meaningful indentation, footnotes, links and emphasis (§5.3).
- **Discard:** source anchors and IDs, site-specific classes and styles. The raw snapshot keeps them for provenance.
- Every block gets an internal passage ID in document order.
- **Fetching:** only allowlisted domains (MIA first), HTTPS only. Loopback, private and link-local addresses are blocked, every redirect hop is re-validated, and response size and time are capped.
- Imported HTML is never rendered directly. It becomes structured text that PLM's own renderer displays.

### 7.4 Drift detection

A weekly GitHub Action runs `plm diff-source`. It classifies each document as `UNCHANGED`, `FORMATTING_CHANGED` (hashes are equal), `TEXT_CHANGED`, `STRUCTURE_CHANGED` or `UNAVAILABLE`. When something changed, it opens an issue with the passage-level diff.

Applying a change is a maintainer-approved source update. It rewrites `source.yml` and the build then marks the affected renderings stale (§5.4).

---

## 8. Contributing

### 8.1 Two ways to contribute, one ledger

1. **In-app (M2):** sign in → editor → submit → community review → bot PR.
2. **Git:** edit the YAML → open a PR. CI and the same checks apply, and a maintainer merges.

Both produce the same files and pass the same `plm validate`.

### 8.2 Contribution types

| Type | Changes |
|---|---|
| `RENDERING` | Create or edit renderings in one document (one or more ranges) |
| `TERM_ALTERNATIVE` | Add a rendering alternative or definition to a term |
| `TERM_DEFAULT` | Change a global or scoped default |
| `EXPLANATION` | Create or edit an explanation |
| `ORIGINAL_TERMS` | Add or fix annotations on the original |
| `METADATA` | Work or document metadata, collections, reading paths |
| `SOURCE_UPDATE` / `NEW_WORK` | `source.yml`, `work.yml`, rights (maintainers only) |

### 8.3 Editor

- The original is read-only. The contributor edits only the rendering text, its coverage (by extending or shrinking the range over neighbouring passages), tokens and notes.
- "Suggest modernization" on a passage opens the editor with the document, passage and current revision already filled in. Nothing has to be copied by hand.
- Every edit records the `base_revision` of each rendering it touches (used for conflict detection, §9.4).

### 8.4 LLM-assisted drafting without server-side AI (D8)

1. **Copy for LLM** builds a self-contained prompt that the contributor pastes into any LLM. It contains:
   - the editorial rules (§8.6);
   - the work's term table with token syntax;
   - the selected passages (typically 5–30) in the exchange format below.
2. **Paste result** parses the LLM's reply in the same format and loads it into the editor. Nothing is submitted until it passes the structural checks and the contributor has reviewed it.
3. Contributors must answer "Was AI used?" on submission. The answer is stored as `ai_assisted`, and the reader shows a badge.

Exchange format (also used by `plm prompt` / `plm apply` in M1):

```text
=== p00017
All history up to now has been the history of class struggles.
=== p00031 p00032
The {bourgeoisie} has played a most revolutionary role in history.
```

A header lists the covered passage IDs. The parser rejects unknown, non-contiguous, overlapping or duplicate IDs.

### 8.5 Structural checks (`packages/checks`)

These checks run live in the editor, on paste, on submit (server-side again) and in CI. They are the same code everywhere.

| Level | Checks |
|---|---|
| **Error** (blocks submit) | Unknown/duplicate/non-contiguous passage IDs; overlapping coverage; empty text; unknown term or form in a token; disallowed markup; covered passage tombstoned |
| **Warning** (shown to reviewers) | Numbers differ from the original; negation/modal words lost (*not, never, only, except, unless, because, therefore, however, although*); quotation count changed; capitalized names missing; length ratio outside 0.5–2.5; question became a statement; authorial distancing ("Marx and Engels argue/call/say…"); inline definitions (an em-dash or "meaning…" gloss right after a known term); added framing sentences ("In other words…", "This was an important step…") |

Warnings don't block submission, but each one stays visible next to the passage throughout review.

### 8.6 Editorial rules

The core rule: **simplify the vocabulary, not the argument.**

- **Preserve:** claims, logical and causal relations, qualifications, negations, modality, subjects and objects, examples, numbers, quotations and historical references.
- **Never:** summarize, add or remove arguments, insert interpretation, modernize concepts, or remove difficult ideas.
- Context and interpretation belong in explanations, never in Plain English.
- **Keep the authors' voice.** Plain English says what the text says, in the first person and with the same force ("The executive of the modern state is nothing but a committee…"). It never reports the text ("Marx and Engels argue that…"), and it doesn't hedge or soften strong claims.
- **No glosses inside the text.** Definitions belong on term cards and context in explanations. A gloss in Plain English duplicates them and makes the rendering run long.
- **Don't modernize terms that are still current English** (capital, division of labour, commodity, world market). Give them a term card, not a substitute.
- These rules are in `docs/editorial/` and are embedded in the "Copy for LLM" prompt.

---

## 9. Community Review (D3)

### 9.1 Roles

Roles are kept in `governance.yml` in Git and synced to the service. This keeps role changes reviewable and recoverable.

| Role | How | Can |
|---|---|---|
| Reader | Anonymous | Read, search, set preferences |
| Contributor | GitHub sign-in, account at least `min_account_age_days` old | Submit contributions; comment on and review others' contributions |
| Trusted contributor | At least 1 merged contribution | Same as contributor, but approvals count toward thresholds |
| Reviewer | Granted by maintainers via a PR to `governance.yml` | Approvals carry more weight (see table) |
| Maintainer | Listed in `governance.yml` | Approve any type; manage roles; source/rights changes |

There are no points, karma or leaderboards. Recognition comes from a visible contribution history.

### 9.2 Approval rules (defaults in `governance.yml`)

| Type | Rule to approve |
|---|---|
| `RENDERING`, `EXPLANATION`, `ORIGINAL_TERMS`, `METADATA` | 2 trusted-contributor approvals **or** 1 reviewer |
| `TERM_ALTERNATIVE` | 1 reviewer |
| `TERM_DEFAULT` | 2 reviewers **or** 1 maintainer, and open for at least 7 days |
| `SOURCE_UPDATE`, `NEW_WORK` | 1 maintainer |

These rules apply to every type:
- Authors cannot approve their own contributions.
- Any open **request changes** blocks approval until the author addresses it or a reviewer dismisses it.
- Approvals apply to a specific contribution revision. A material edit resets them.
- `bootstrap_mode: true` lets a single maintainer approval satisfy any rule. It is meant for the period before there are enough reviewers.

### 9.3 Proofreading view

For each covered range, the reviewer sees:
- the **original**;
- the **current published** rendering, if there is one;
- the **proposed** rendering, with a word-level diff against the current one;
- tokens shown resolved, with a toggle to show them raw;
- the check warnings for the passage.

Reviewers can leave comments on a passage and suggest edits, which the author accepts or declines. They give one verdict per contribution: **approve**, **request changes** or **comment**.

Review checklist: did the subject, object, negation, modality, causality, qualification, terminology or historical meaning change?

### 9.4 Lifecycle

```text
DRAFT → SUBMITTED ⇄ CHANGES_REQUESTED → APPROVED → PUBLISHING → MERGED
                 ↘ REJECTED / WITHDRAWN        ↘ PUBLISH_FAILED (CI failure; maintainers notified)
any open state → STALE (a touched rendering's revision moved on; author rebases on the new version)
```

### 9.5 Publishing to Git

When a contribution reaches `APPROVED`:
1. The publisher in the service checks that every `base_revision` is still current. If not, the contribution becomes `STALE`.
2. It writes the files with `packages/content`, using the same writer as the CLI, and increments `revision`.
3. It opens a PR through a GitHub App, on branch `contrib/<id>`, with the contributor as commit author:
   - the commit subject follows the usual formats, e.g. `content(manifesto/ch01): update p00031–p00032 [c_01J…]`;
   - the PR body links the contribution and lists the reviewers, the check warnings and the AI declaration.
4. It enables auto-merge. CI runs `plm validate`, and the merge triggers a rebuild and deploy.
5. Merges are serialized (one at a time), so concurrent approvals cannot conflict. Maintainers can revert any merge in Git.

---

## 10. URLs and the Static Data Contract

### 10.1 Reader URLs

- Reader URLs mirror the source path: `/archive/marx/works/1848/communist-manifesto/ch01.htm`.
- View mode is client state (`?view=original|plain|parallel`). The canonical link is the bare path.
- Each passage renders as `<section id="p00017">`, so `ch01.htm#p00017` deep-links to it in every mode.
- In Plain English mode, a link to a passage that sits inside a multi-passage rendering scrolls to that rendering and highlights it. Parallel mode scrolls both columns.
- Source anchors (MIA's `#015`) are not supported. A link carrying one opens the document at the top.
- Every page links "View original source" to the source page and shows visible MIA attribution. PLM never presents itself as an MIA project.

### 10.2 Static data (`/data/v1/`)

This is the public read API, generated by `plm build` and versioned.

| File | Content |
|---|---|
| `index.json` | Works, documents, collections, reading paths |
| `documents/{source-path}.json` | Passages, renderings (raw tokens **and** default-resolved text), original annotations, explanations, revisions, stale flags |
| `terms/{slug}.json` | Term card data, alternatives, usage counts |
| `manifest.json` | Release ID, content commit, schema versions, counts, checksums |

- The reader's interactive features use only these files. Pages are also pre-rendered with default terminology for no-JS users and search engines.
- The extension finds a document by taking the MIA URL path and fetching `documents/{path}.json`. A 404 means "not available yet". No mapping database is needed.
- `v1` changes stay backward-compatible. A breaking change ships `/data/v2/` alongside `v1`.

### 10.3 Search

Pagefind indexes the built pages, and results are labelled by layer (Original, Plain, Vocabulary, Explanation). It needs no server.

### 10.4 Domain independence

The public base URL is build configuration, so moving to another domain or a mirror requires no content changes.

---

## 11. Community Service API (M2)

Base path `/api/v1`. It is Zod-validated, publishes OpenAPI at `/api/openapi.json` and never serves published content.

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /auth/github`, `GET /auth/callback`, `POST /auth/logout`, `GET /me` | — | Session (secure, httpOnly cookie + CSRF token) |
| `POST /contributions` | Contributor | Create draft `{type, document, base_revisions, payload}` |
| `GET /contributions?status=&document=&type=` | Public | Review queue / passage history |
| `GET`, `PATCH /contributions/{id}` | Public / author | Read; edit draft |
| `POST /contributions/{id}/submit`, `/withdraw` | Author | Lifecycle (submit re-runs checks) |
| `POST /contributions/{id}/reviews` | Contributor+ | `{verdict, comments[]}` |
| `POST /contributions/{id}/dismiss-review/{rid}` | Reviewer+ | Dismiss a blocking review |
| `POST /imports` | Maintainer (M3) | Run an adapter → `NEW_WORK`/`SOURCE_UPDATE` draft |
| `GET /audit` | Maintainer | Audit events |
| `GET /health`, `GET /ready` | Public | Liveness / DB readiness (no error detail) |

- **Errors:** `{"error": {"code": "…", "message": "…", "request_id": "…"}}`. No stack traces are returned.
- **Abuse limits:** rate limits per IP and per account, Turnstile on submit, payload size caps and the minimum account age.
- **Audit events:** role changes, approvals, dismissals, publishes, rejections, rights and source changes.

**Database tables:** `users`, `sessions`, `contributions`, `contribution_revisions`, `reviews`, `review_comments`, `publish_attempts`, `audit_events`, `roles` (synced from `governance.yml`).

---

## 12. Reader UI

| Area | Requirement |
|---|---|
| Modes | Original, Plain English, Parallel. Parallel scroll is synced by passage. A rendering that covers several passages lines up with the whole group |
| Layer distinction | Distinct typography and labels for Original, Plain English and Explanation |
| Missing / stale | "Plain English not yet available — Suggest one". A stale rendering shows "Source changed since this was written" |
| Term highlights | Subtle dotted underline on a `<button>`. Tap or click opens the card. Long-press keeps native text selection |
| Term card | Floating on desktop, bottom sheet on mobile. Shows the term, the displayed wording, short definition, "Why this wording?" (reason + limitation), alternatives with usage counts, and a link to the vocabulary page |
| Terminology preference | Global setting: "Project default / Original terms / Choose per term". Stored locally (§6.3) |
| Explain | Per-passage panel with explanations, key terms and related passages, labelled by kind |
| Badges | "Source verified", "Community reviewed", "AI-assisted". No truth scores |
| Preferences | Theme, font size, line height, mode, card style, highlights, reading progress, bookmarks — `localStorage`, no account |
| Community unavailable | Contribute buttons show "Contributions are temporarily unavailable". Reading is unaffected |
| Accessibility | WCAG 2.2 AA; keyboard support (Enter/Space/Escape/Tab), screen-reader labels, visible focus, reduced motion, semantic HTML |
| Performance targets | LCP < 2.5 s, interaction < 100 ms, term card < 100 ms |
| Hierarchy | Text > navigation > terms > explanations > community features |

---

## 13. Security and Privacy

- HTTPS everywhere.
- Content markup is sanitized against an allowlist. PLM renders structured content only, never raw imported or contributed HTML.
- The community service uses secure cookies, CSRF protection, parameterized queries (Drizzle) and Zod input validation.
- Secrets live in the platform's secret store. `.env` is gitignored, and building the static site requires no secrets.
- The GitHub App has only `contents` and `pull_requests` permissions, on the content repository only.
- Supply chain: lockfile, Renovate, dependency audit in CI.
- Privacy: no tracking or behavioral analytics, and aggregate counts at most. Logs record request ID, route, status, latency and error class, never reading history.

---

## 14. Operations

### 14.1 Build and deploy

```text
merge to main → CI: plm validate + tests → plm build → static deploy (any host)
                                                     → publish release artifacts
API (M2): container deploy → run migrations → health check
```

**Release artifacts:** `site.tar.gz`, `content.tar.gz`, `manifest.json`, `checksums.txt`. A release can be rebuilt from commit + lockfile alone, with no private data.

**Hosting at bootstrap:**
- the static site on any free static host behind a CDN;
- in M2, the API and Postgres on one small VPS or managed free tier.

### 14.2 Scheduled jobs (GitHub Actions)

- Weekly source drift check (§7.4).
- Weekly link check.
- Nightly database backup (M2).

### 14.3 Disaster recovery

| Failure | Impact / recovery |
|---|---|
| Static host lost | Deploy the last release artifact anywhere |
| Community service or DB lost | Reading is unaffected. Git contributions continue. Restore the DB from the nightly backup; only drafts and reviews since the last backup are lost |
| Domain lost | Change the build's base URL and redeploy |
| GitHub lost | Any clone works. CI steps are plain `plm` commands |
| MIA unavailable | Imported works are unaffected (stored in Git). New imports pause |
| Maintainer unavailable | `DEPLOYMENT.md` covers clone → build → deploy with no private steps. `governance.yml` defines how maintainers are added or replaced. The target bus factor is at least 3 |

### 14.4 Mirrors

A mirror serves a release's `site.tar.gz` as-is, after checking it against `checksums.txt`. It may expose `/.well-known/plm-mirror.json`, containing the release, content commit, contact and last sync time.

---

## 15. Testing

| Level | Coverage |
|---|---|
| Parser | Fixture HTML → golden normalized JSON: block count and types, preserved layout (line breaks, indentation, emphasis, footnotes), headings, metadata; source anchors absent |
| Content | `plm validate`: schemas, IDs, coverage rules, `based_on`, annotations, tokens, rights, links |
| Checks | Unit tests for every error and warning rule, plus the exchange-format parser |
| Terms | Token parsing, form completeness, resolution order, capitalization |
| Build | Static data matches the schema. Builds are deterministic (same input, same output) |
| Service (M2) | Approval-rule engine, lifecycle transitions, stale detection, publisher (against a test repo) |
| E2E (Playwright) | MIA fixture → import → render → Original matches the source layout → `ch01.htm#p00017` lands on the passage in every mode → mode switch → term card → preference swap. M2 adds: contribute → review → publish |

---

## 16. Delivery Plan

### 16.1 Milestones

| # | Milestone | Scope |
|---|---|---|
| **M0** | Foundation | Monorepo, licenses, Zod schemas, `plm validate`, CI, editorial rules doc, `governance.yml` |
| **M1** | Static reader slice | MIA adapter, `plm import`, *Manifesto* Ch. I, term system and vocabulary, `plm prompt` / `plm apply`, Plain English for Ch. I via Git PRs, `plm build`, reader (3 modes, passage deep links, term cards, preferences, search), deploy, release artifacts, drift Action |
| **M2** | Community contributions | Community service, GitHub sign-in, editor with Copy/Paste LLM flow, checks, proofreading review, approval engine, GitHub App publisher, audit log |
| **M3** | Archive growth | Rest of the *Manifesto*, more works, collections and reading paths, in-app `NEW_WORK` / `SOURCE_UPDATE`, source comparison view |
| **M4** | Distribution | Browser extension, PWA/offline, EPUB, mirror program |
| **M5** | Sustainability | `/fund` with a public ledger, hosting sponsorship, governance hand-over, bus factor ≥ 3 |
| **M6** | Long term | Other languages (`vi-plain`, …), browser-only bring-your-own-key AI assist, scholarly annotations, concept graph |

**MVP = M0 + M1 + M2.**

### 16.2 MVP acceptance test

1. Open the PLM version of Chapter I. The Original matches the source's layout, and `#p00017` deep-links to the right passage in every mode.
2. Switch between Original, Plain English and Parallel.
3. Open a term card and see the definition, alternatives and usage counts. Switch to "Original terms" and see the Plain English update while the original stays the same.
4. Sign in and click "Suggest modernization" on an untranslated passage.
5. Use "Copy for LLM", paste the result back, fix the reported warnings and submit.
6. A second account reviews the contribution in the proofreading view and approves it.
7. The bot PR passes CI and merges.
8. The change is live after the rebuild.
9. Delete the database and redeploy the site from Git alone: all published content is intact.

### 16.3 Definition of done

- **Published work:** rights verified, all passages imported, layout checked against the source, renderings reviewed, terms annotated, links valid, live.
- **Production-ready:** deploy and restore documented and tested, CI green, monitoring on the API, security baseline met.
- **Sustainable:** a new maintainer can clone, build, deploy, restore and approve contributions using only the docs.

---

## 17. System Rules

1. The original text is never overwritten. Only an approved source update can change `source.yml`.
2. After import, only PLM's internal structure counts. Source markup is discarded, while the original layout is preserved. An internal ID is never an ordinal position.
3. Passage IDs are never reused. Removed passages are tombstoned.
4. Every rendering covers an explicit, contiguous range of passages.
5. Terminology is changed through tokens and reviewed defaults, never through find/replace.
6. Usage counts describe community usage, not correctness.
7. AI output enters only through the editor's checks and human review, and it is always declared.
8. Only published content lives in Git. Everything published is in Git.
9. Reading never depends on a server, database, account or AI provider.
10. The original source is always one click away.
11. Rights are verified per work. Unknown means not imported.
12. No host, provider, database or person is a single point of failure.

---

## 18. Open Items and Risks

| Item | Notes |
|---|---|
| Domain | Not chosen. It does not block work because the base URL is configuration |
| `.htm` paths on static hosts | Verify early in M1 that the chosen host serves `…/ch01.htm` as HTML; otherwise add a build step to rename the files |
| Plain register undefined | §8.6 gives the rules but no target reading level or style. Task 005 defines it before any rendering is written |
| Original is a translation | The English Original is Moore's 1888 translation, so PLM modernizes a translation. German terms go in explanations. Task 005 documents this, and task 020 covers it in the FAQ |
| MIA markup variety | MIA's HTML differs between works and eras. Collect fixtures from several works at the start of M1 and check that the layout markup (§5.3) can represent them before freezing the parser |
| Grammar of token swaps | Articles ("a"/"an") and agreement can break when wordings are swapped. Mitigations: form and number constraints (§6.1), and the TERM_DEFAULT preview. Track the errors reviewers report during M1 |
| Small reviewer pool | `bootstrap_mode` covers this. Turn it off once there are at least 3 reviewers |
| GitHub-only sign-in | Excludes contributors without a GitHub account. Other identity providers can be added later; contributing through Git PRs is always possible |
