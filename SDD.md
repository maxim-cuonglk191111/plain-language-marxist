
# Plain Language Marxist Reading Layer

## System Design Document — v1.0

**Status:** Architecture Frozen / Implementation Ready
**Project type:** Open-source digital reading infrastructure
**Primary goal:** Preserve historical texts while providing a transparent, community-maintained modern-English reading layer.

---

# 1. Executive Summary

Plain Language Marxist Reading Layer (PLMRL) is an open-source platform for reading historical Marxist and Marxism-related texts through three distinct layers:

1. **Original**

   * The source text as published/transcribed.
   * Never silently modified by the platform.
2. **Plain English**

   * A modern-language rendering intended to reduce archaic vocabulary and syntactic difficulty.
   * It is an aid to reading, not a replacement for the original.
3. **Explanation**

   * Context, terminology, historical notes, conceptual clarification and editorial commentary.
   * Explicitly separated from the modernization layer.

The system is designed around five principles:

> **Preserve the source.
> Modernize the interface.
> Make interpretation visible.
> Make contributions reproducible.
> Make the project survivable without its founder.**

The system uses:

* a Git repository as the canonical content source;
* a dedicated Content API;
* a PostgreSQL database for indexed/read-optimized data and community state;
* a web application;
* an optional future browser extension;
* automated source ingestion and validation;
* structured AI-assisted contribution tooling;
* human review before publication;
* static/export capabilities for mirrors and archival copies.

The platform must remain usable even if:

* the database disappears;
* the API disappears;
* the original maintainer disappears;
* the main hosting provider disappears;
* the browser extension is abandoned.

The Git repository and released content snapshots therefore remain the ultimate recovery mechanism.

---

# 2. Problem Statement

Historical Marxist texts are often difficult for contemporary readers because of:

* archaic vocabulary;
* Victorian/19th-century syntax;
* unfamiliar political/economic terminology;
* historical references;
* long sentences;
* terminology whose modern meaning differs from its historical meaning.

The problem is not necessarily that the underlying argument is too complicated.

A reader may understand the conceptual argument once the language barrier is removed.

The project therefore does not attempt to summarize or replace the source.

Instead:

> **The original text remains the authority. The Plain English layer reduces linguistic friction. The explanation layer makes interpretation explicit.**

---

# 3. Non-Goals

The project will NOT initially attempt to become:

* a social network;
* a political organization;
* a discussion forum;
* a general-purpose wiki;
* an automatic AI Marxism interpreter;
* an automated ideological correctness engine;
* a replacement for source archives;
* a proprietary SaaS product;
* a recommendation algorithm that determines which political tendency is "correct."

The system may eventually contain multiple traditions, reading paths and interpretations.

Those should be represented as identifiable editorial/educational structures rather than hidden ranking mechanisms.

---

# 4. Architectural Principles

## 4.1 Source preservation

Original text must never be overwritten.

Every source version is immutable once published.

A modernization may change.

The source does not.

---

## 4.2 Separation of layers

Every passage has conceptually independent fields:

```text
SOURCE
   ↓
ORIGINAL
   ↓
PLAIN ENGLISH
   ↓
EXPLANATION
```

These must never be collapsed into a single "enhanced text."

---

## 4.3 Stable identity

A source URL is not a sufficient internal identifier.

MIA URLs can change.

HTML structure can change.

Anchors can change.

The system therefore uses internal immutable IDs.

Example:

```text
work:marx:1848:communist-manifesto
document:marx:1848:communist-manifesto:ch01
passage:marx:1848:communist-manifesto:ch01:p00017
```

The MIA URL is stored as metadata:

```text
source_url:
https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm#015
```

---

# 5. Critical Terminology

This distinction is fundamental.

## 5.1 Source URL

The original external location.

Example:

```text
https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm#015
```

---

## 5.2 Source locator

The fragment used by the source.

Example:

```text
#015
```

This is **not** assumed to mean paragraph 15.

It is simply:

```text
source_locator = "015"
```

The platform preserves it exactly.

---

## 5.3 Source block

A structural unit extracted from the source HTML.

Examples:

```text
paragraph
heading
blockquote
list
footnote
table
caption
```

---

## 5.4 Passage

Our normalized semantic reading unit.

A passage normally corresponds to one source paragraph, but does not have to.

Example:

```text
passage_id:
p00017
```

---

## 5.5 Span

A character-range inside a passage.

Example:

```text
passage: p00017
start: 13
end: 22
```

Spans are used for terminology highlighting.

---

# 6. URL Architecture

The public URL must imitate the source archive as closely as reasonably possible.

Example:

```text
https://modernmarxist.org/archive/marx/works/1848/communist-manifesto/ch01.htm
```

and:

```text
https://modernmarxist.org/archive/marx/works/1848/communist-manifesto/ch01.htm#015
```

The path is intentionally source-shaped.

This provides three advantages:

1. human readability;
2. easy source comparison;
3. future browser-extension mapping.

---

# 7. URL Mapping

The system maintains:

```text
MIA URL
       ↓
Source Document
       ↓
Internal Passage
```

Example:

```yaml
source:
  url: "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm"

mapping:
  source_locator: "015"
  internal_passage_id: "p00017"
```

The system must never infer:

```text
015 = paragraph 15
```

unless verified from the source structure.

---

# 8. Canonical URL Rules

Canonical reader URL:

```text
/archive/{author}/works/{year}/{work}/{document}.htm
```

Optional fragment:

```text
#015
```

View mode should not normally change the canonical URL.

Instead:

```text
?view=original
?view=plain
?view=parallel
```

may be used as UI state.

Canonical indexing remains:

```text
/archive/.../ch01.htm
```

---

# 9. URL Compatibility Contract

For every imported source document:

```text
source_url
public_url
```

must be stored.

Example:

```yaml
source_url: https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm
public_url: https://modernmarxist.org/archive/marx/works/1848/communist-manifesto/ch01.htm
```

A future browser extension can therefore perform:

```text
marxists.org/archive/...
        ↓
modernmarxist.org/archive/...
```

without requiring a separate URL database.

---

# 10. Why an API Exists

The project should not be purely static.

A dedicated API is justified because the system needs:

* term resolution;
* vocabulary search;
* contribution submission;
* source ingestion;
* source verification;
* community usage counts;
* revision history;
* moderation;
* AI contribution jobs;
* extension support;
* future clients;
* mobile clients;
* offline synchronization.

However:

> The API is not the ultimate source of truth.

The repository remains the canonical editorial source.

---

# 11. High-Level Architecture

```text
                         ┌──────────────────┐
                         │   MIA / Sources  │
                         └────────┬─────────┘
                                  │
                                  │ ingest
                                  ▼
                       ┌─────────────────────┐
                       │ Source Ingestion    │
                       │ + HTML Parser       │
                       │ + Validator         │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ Canonical Content   │
                       │ Git Repository      │
                       └──────────┬──────────┘
                                  │
                         build / sync
                                  │
                    ┌─────────────┴──────────────┐
                    ▼                            ▼
          ┌──────────────────┐         ┌─────────────────┐
          │ PostgreSQL       │         │ Static Export   │
          │ Search / API DB  │         │ / Mirrors       │
          └────────┬─────────┘         └─────────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Content API      │
          └────────┬─────────┘
                   │
          ┌────────┼───────────┐
          ▼        ▼           ▼
       Website   Extension   Future clients
```

---

# 12. Recommended Technology Stack

## Frontend

Recommended:

```text
Next.js + TypeScript
```

Reasons:

* excellent URL routing;
* SSR/SSG support;
* good accessibility ecosystem;
* PWA capability;
* future extension reuse;
* easy deployment.

---

## API

Recommended:

```text
FastAPI + Python
```

Reasons:

* excellent HTML parsing ecosystem;
* excellent text-processing ecosystem;
* strong AI integration;
* type validation with Pydantic;
* easy ingestion tooling.

Alternative:

```text
TypeScript/NestJS
```

is acceptable.

The API contract matters more than the implementation language.

---

## Database

```text
PostgreSQL
```

Used for:

* search indexes;
* published content index;
* terms;
* contribution state;
* usage statistics;
* moderation state;
* revision metadata.

---

## Repository

```text
GitHub / GitLab
```

The project should not be technically dependent on GitHub.

Git is the important dependency.

---

## Cache

Initially:

```text
Redis: optional
```

Do not introduce Redis until actual load requires it.

---

## Search

Phase 1:

```text
PostgreSQL full-text search
```

Later:

```text
OpenSearch / Meilisearch / Typesense
```

only if necessary.

---

# 13. Repository Architecture

Recommended monorepo:

```text
/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── content-schema/
│   ├── source-parser/
│   ├── renderer/
│   ├── terminology/
│   └── url-mapper/
│
├── content/
│   ├── authors/
│   ├── works/
│   └── vocabulary/
│
├── ingestion/
│   ├── sources/
│   ├── snapshots/
│   └── scripts/
│
├── docs/
│   ├── architecture/
│   ├── editorial/
│   └── contribution/
│
├── schemas/
│
├── scripts/
│
├── tests/
│
├── CONTRIBUTING.md
├── LICENSE
├── CODE_OF_CONDUCT.md
└── README.md
```

---

# 14. Content Repository

Example:

```text
content/
└── works/
    └── marx/
        └── 1848/
            └── communist-manifesto/
                ├── metadata.yml
                ├── rights.yml
                ├── source.yml
                ├── ch01.yml
                ├── ch02.yml
                ├── ch03.yml
                └── ch04.yml
```

---

# 15. Document Schema

Example:

```yaml
id: document:marx:1848:communist-manifesto:ch01

work_id: work:marx:1848:communist-manifesto

title: "Manifesto of the Communist Party"
section: "Chapter I"

source:
  provider: "Marxists Internet Archive"
  url: "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm"
  retrieved_at: "2026-10-03"
  content_hash: "sha256:..."

rights:
  status: "public-domain"
  verification: "manual"
  notes: "..."

passages:
  - id: "p00001"
    source_locator: "001"
    original: "..."
    plain_english: "..."
    status: "published"

  - id: "p00002"
    source_locator: "002"
    original: "..."
    plain_english: "..."
    status: "published"
```

---

# 16. Passage Schema

A passage is the fundamental editorial unit.

```yaml
id: "p00017"

source:
  locator: "015"
  element_type: "paragraph"
  source_hash: "sha256:..."

original:
  text: "..."

plain_english:
  text: "..."
  status: "published"
  revision: 3

terms:
  - term_id: "term:bourgeoisie"
    spans:
      - start: 12
        end: 23

notes: []

history:
  source_revision: 1
  plain_english_revision: 3
```

---

# 17. Source Hashing

Every imported source block receives a hash.

Example:

```text
sha256(normalized_original_text)
```

This solves a major problem.

Suppose MIA changes:

```text
bourgeoisie
```

to:

```text
bourgeoisie
```

with different HTML but identical text.

The system can distinguish:

```text
HTML changed
```

from:

```text
content changed
```

---

# 18. Source Drift Detection

The ingestion pipeline periodically fetches source URLs.

It compares:

```text
old source hash
vs.
new source hash
```

Possible states:

```text
UNCHANGED
FORMATTING_CHANGED
TEXT_CHANGED
STRUCTURE_CHANGED
SOURCE_UNAVAILABLE
POSSIBLE_REDIRECT
```

If the source changes, existing Plain English must not automatically be overwritten.

Instead:

```text
SOURCE_CHANGED
      ↓
review required
      ↓
compare old/new
      ↓
update mapping if necessary
```

---

# 19. Source Ingestion Workflow

A contributor should be able to provide:

```text
Paste MIA URL
```

Example:

```text
https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm
```

The system then:

```text
URL
 ↓
validate domain
 ↓
fetch page
 ↓
verify HTTPS
 ↓
parse HTML
 ↓
identify document metadata
 ↓
extract source blocks
 ↓
extract anchors
 ↓
normalize text
 ↓
calculate hashes
 ↓
generate preview
 ↓
ask contributor to confirm
```

---

# 20. Why Contributors Should Not Manually Paste the Original

Do not ask users to manually copy the source text into the contribution form.

That creates:

* transcription errors;
* accidental omission;
* altered punctuation;
* incorrect paragraph boundaries;
* copyright ambiguity;
* unreliable provenance.

Instead:

> **The URL is the source of truth for ingestion.**

The contributor supplies the URL.

The server retrieves and parses the source.

---

# 21. Source URL Security

The ingestion endpoint must NOT be a generic unrestricted URL fetcher.

Only approved source domains should be allowed.

Example allowlist:

```yaml
sources:
  - domain: "www.marxists.org"
    enabled: true
```

Future:

```yaml
  - domain: "archive.org"
  - domain: "libcom.org"
```

Each provider gets its own parser.

---

# 22. SSRF Protection

The fetcher must block:

```text
localhost
127.0.0.1
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
::1
private IPv6
file://
ftp://
gopher://
```

Only:

```text
https://
```

should be accepted.

Redirects must be validated again.

---

# 23. MIA Parser

The MIA parser should be isolated:

```text
packages/source-parser/
    mia/
        parser.py
        selectors.yml
        tests/
```

The parser converts:

```text
MIA HTML
```

into:

```text
Normalized Source Document
```

It should preserve:

* headings;
* paragraphs;
* lists;
* quotations;
* footnotes;
* anchors;
* links;
* emphasis;
* source metadata.

---

# 24. Normalized Source Representation

Example:

```json
{
  "document_id": "source-document-001",
  "source_url": "...",
  "blocks": [
    {
      "index": 17,
      "locator": "015",
      "type": "paragraph",
      "text": "The history of all hitherto existing society...",
      "hash": "sha256:..."
    }
  ]
}
```

The parser output is deterministic.

Given the same source snapshot:

```text
same input → same normalized output
```

---

# 25. Source Snapshot

Every imported source should optionally be stored as a snapshot.

```text
ingestion/
└── snapshots/
    └── source-document-001/
        ├── 2026-10-03.html
        └── manifest.json
```

This is important for reproducibility.

The snapshot is subject to the source's legal status.

If full-source storage is not legally permitted, the project stores:

* URL;
* metadata;
* hash;
* structural mapping;
* permitted excerpt;
* transformation data.

---

# 26. Rights Management

Do not assume:

```text
MIA = everything is public domain
```

MIA itself explicitly states that unless otherwise noted, texts are public domain, while some texts are copyrighted or reproduced with permission; MIA-created translations/material may be CC BY-SA.

Therefore every work requires:

```yaml
rights:
  source_status:
  source_license:
  source_rights_holder:
  redistribution_allowed:
  derivative_allowed:
  attribution_required:
  share_alike_required:
  verification:
  verified_by:
  verified_at:
```

---

# 27. Rights States

Supported states:

```text
PUBLIC_DOMAIN
CC_BY
CC_BY_SA
OTHER_OPEN_LICENSE
PERMISSION_REQUIRED
FAIR_USE_ONLY
UNKNOWN
BLOCKED
```

`UNKNOWN` must never automatically become `PUBLIC_DOMAIN`.

---

# 28. Content License Separation

The project has three separate legal objects:

```text
Source text
Modernization
Software
```

They must have independent licensing metadata.

Example:

```text
source:
  license: public domain

plain_english:
  license: CC BY-SA 4.0

software:
  license: AGPL-3.0
```

The exact project licenses should be finalized separately with legal review.

---

# 29. Plain English Is Structured Data

This is critical.

Do NOT store the modernization as a single giant chapter string.

Store:

```text
passage → plain_english
```

not:

```text
chapter → plain_english_blob
```

This makes:

* review;
* diffing;
* AI generation;
* term mapping;
* translation;
* versioning;
* extension support

possible.

---

# 30. Paragraph Alignment

The fundamental invariant is:

```text
1 source passage
       ↓
0 or 1 primary Plain English rendering
```

For ordinary prose:

```text
Original paragraph 001
→ PE paragraph 001

Original paragraph 002
→ PE paragraph 002
```

If a source paragraph requires splitting:

```text
source p001
→ PE p001.a
→ PE p001.b
```

If two source paragraphs must be combined for grammatical reasons:

```text
source p001 + p002
→ PE group g001
```

But the source mapping must remain explicit.

---

# 31. Alignment Model

Use an alignment table:

```text
plain_block
    ↓
source_blocks[]
```

Example:

```yaml
plain_block:
  id: "pe00031"
  source_blocks:
    - "p00031"
    - "p00032"
```

Never assume positional alignment forever.

---

# 32. AI Generation Architecture

AI must NEVER receive:

```text
"Rewrite this whole chapter."
```

That is structurally unsafe.

Instead AI receives a structured task.

Example:

```json
{
  "task": "plain_english",
  "document_id": "...",
  "passages": [
    {
      "id": "p00017",
      "source_locator": "015",
      "original": "..."
    }
  ]
}
```

---

# 33. AI Output Contract

AI must return strict JSON.

Example:

```json
{
  "document_id": "...",
  "results": [
    {
      "passage_id": "p00017",
      "plain_english": "...",
      "term_proposals": [
        {
          "source_term": "bourgeoisie",
          "candidate": "capitalist class"
        }
      ],
      "notes": []
    }
  ]
}
```

No Markdown.

No headings.

No chapter text.

No omitted passage IDs.

---

# 34. AI Prompt Contract

The system prompt should contain rules equivalent to:

```text
You are modernizing vocabulary and syntax, not rewriting the argument.

Preserve:
- claims
- logical relationships
- qualifications
- negations
- subjects
- objects
- causal relationships
- modality
- examples
- historical references

Do not:
- summarize
- add arguments
- remove arguments
- introduce modern political concepts
- insert interpretation
- change ideological terminology without proposing it separately
- merge passages
- split passages
- reorder passages

Return JSON matching the provided schema.
```

---

# 35. AI Must Treat Terminology Separately

AI should not silently decide:

```text
bourgeoisie → capitalist class
```

inside the final text without recording the decision.

Instead:

```json
{
  "source_term": "bourgeoisie",
  "candidate": "capitalist class",
  "reason": "...",
  "confidence": 0.91
}
```

The human reviewer decides whether to accept it.

---

# 36. AI Prompt Versioning

Every AI-generated contribution stores:

```text
model
model_version
prompt_version
schema_version
temperature/settings if relevant
input_hash
output_hash
generated_at
```

Example:

```yaml
ai:
  provider: "..."
  model: "..."
  prompt_version: "pe-v3"
  schema_version: "1.2"
  input_hash: "sha256:..."
  generated_at: "..."
```

This allows future reproduction.

---

# 37. AI Cannot Publish Directly

Pipeline:

```text
AI generation
      ↓
schema validation
      ↓
source alignment validation
      ↓
semantic/editorial review
      ↓
human approval
      ↓
Git commit / PR
      ↓
CI
      ↓
publish
```

Never:

```text
AI → production
```

---

# 38. AI Failure Detection

The validator checks:

### Structural

* missing passage;
* duplicate passage;
* reordered passage;
* unexpected passage;
* invalid JSON;
* invalid Unicode;
* malformed Markdown.

### Semantic heuristics

* output dramatically shorter;
* output dramatically longer;
* negation disappeared;
* quotation disappeared;
* numbers changed;
* named entities changed;
* modal words disappeared;
* question became assertion.

These do not prove an error.

They flag a review.

---

# 39. Numeric Preservation

Numbers must be checked.

Example:

```text
1848
```

must not accidentally become:

```text
1948
```

Same for:

* dates;
* percentages;
* quantities;
* citations;
* chapter numbers;
* footnote references.

---

# 40. Quote Preservation

Quoted historical phrases should be represented structurally where possible.

Example:

```yaml
segments:
  - type: text
    value: "..."
  - type: quotation
    source: "..."
```

This prevents AI from accidentally paraphrasing quotations.

---

# 41. Term System

Terms are first-class entities.

```text
Term
├── canonical_name
├── aliases
├── definitions
├── mappings
├── contexts
└── references
```

Example:

```text
term: bourgeoisie
```

---

# 42. Term Mapping

A mapping has:

```yaml
source_term: bourgeoisie

replacement:
  text: "capitalist class"

scope:
  type: "global"

status:
  proposed
```

---

# 43. Mapping Scope

Supported scopes:

```text
PASSAGE
WORK
AUTHOR
GLOBAL
```

Priority:

```text
PASSAGE
   ↓
WORK
   ↓
AUTHOR
   ↓
GLOBAL
```

A passage-specific decision overrides a global default.

---

# 44. Why This Matters

The same term may require different modern renderings in different contexts.

Therefore:

```text
one term ≠ one mandatory translation
```

The system supports:

```text
bourgeoisie
├── capitalist class
├── bourgeois class
├── bourgeoisie
└── capitalist ruling class
```

without automatically declaring one universally correct.

---

# 45. Community Usage Counts

The UI may display:

```text
capitalist class
2,431 uses
```

But this must be labeled correctly.

It means:

> community usage / adoption

not:

> objectively correct translation.

Usage counts must not become an automatic truth-ranking mechanism.

---

# 46. How Usage Counts Are Calculated

Do not count raw database rows.

Use:

```text
approved published mappings
```

and optionally:

```text
active document references
```

Example:

```text
usage_count =
number of published passage mappings using this rendering
```

A user repeatedly editing the same mapping does not create 500 uses.

---

# 47. Term Contribution UI

When a user highlights:

```text
bourgeoisie
```

the card displays:

```text
bourgeoisie

Suggested modern renderings:

Capitalist class      2,431 uses
Bourgeois class         618 uses
Bourgeoisie             441 uses

[Suggest another]
[Explain]
[View history]
```

---

# 48. Term Card

Default desktop behavior:

```text
floating card
```

Default mobile behavior:

```text
bottom sheet
```

Optional:

```text
side panel
inline
full explanation mode
```

---

# 49. Highlighting

Use subtle visual treatment:

```text
dotted / dashed underline
```

not:

```text
bright yellow background
```

The highlight should communicate:

> "This is an interactive concept."

It should not visually dominate the text.

---

# 50. Term Card Data

```json
{
  "term": "bourgeoisie",
  "rendering": "capitalist class",
  "short_definition": "...",
  "why": "...",
  "source": "...",
  "usage_count": 2431,
  "alternatives": []
}
```

---

# 51. "Why This Wording?"

Every significant terminology mapping may have:

```text
Why this wording?
```

Example:

```text
Original:
bourgeoisie

Modernization:
capitalist class

Reason:
This rendering makes the class reference more immediately
understandable to contemporary readers.

Limitation:
It may foreground the economic dimension more strongly than
the historical French/German term does in some contexts.
```

This prevents silent interpretation.

---

# 52. Three-Layer UI

The reader must visually distinguish:

### ORIGINAL

```text
Source text
```

### PLAIN ENGLISH

```text
Modern rendering
```

### EXPLANATION

```text
Editorial explanation
```

Different typography and labels should make these impossible to confuse.

---

# 53. Reader Modes

Required:

```text
Original
Plain English
Parallel
```

Recommended:

```text
Plain → Original
```

for readers who first want comprehension and then verification.

---

# 54. Parallel Mode

Desktop:

```text
┌──────────────────────┬──────────────────────┐
│ ORIGINAL             │ PLAIN ENGLISH        │
│                      │                      │
│ paragraph            │ paragraph            │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

Scroll synchronization should be passage-based, not pixel-based.

---

# 55. Passage Anchoring

Every passage renders:

```html
<section id="p00017" data-source-locator="015">
```

The public MIA-compatible anchor can additionally be exposed:

```html
<a id="015"></a>
```

Thus:

```text
#015
```

lands on the corresponding content even though internally:

```text
p00017
```

is the actual identity.

---

# 56. Browser Extension

The extension is Phase 2.

It should NOT have its own content database.

Architecture:

```text
MIA page
 ↓
detect URL
 ↓
map source URL
 ↓
fetch MMRL API
 ↓
inject Plain English / terms
```

The extension becomes a client of the same API.

---

# 57. Extension URL Mapping

Example:

```text
https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm
```

maps to:

```text
https://modernmarxist.org/archive/marx/works/1848/communist-manifesto/ch01.htm
```

No hardcoded per-book database should be required.

---

# 58. Extension Fallback

If no modernization exists:

```text
No Plain English version yet.

[Suggest Plain English]
[Open Modern Marxist]
```

This creates a direct contribution loop.

---

# 59. Contribution Workflow

Primary workflow:

```text
User
 ↓
Paste source URL
 ↓
System fetches source
 ↓
System parses source
 ↓
Preview
 ↓
Select contribution type
 ↓
AI assist / manual editing
 ↓
Validation
 ↓
Submit
 ↓
Review
 ↓
Merge
 ↓
Build
 ↓
Publish
```

---

# 60. Contribution Types

```text
PLAIN_ENGLISH
TERM_MAPPING
TERM_DEFINITION
EXPLANATION
SOURCE_CORRECTION
METADATA_CORRECTION
TRANSLATION_NOTE
HISTORICAL_CONTEXT
TYPO_CORRECTION
```

---

# 61. Contribution Scope

A contributor chooses:

```text
This passage
This work
Global
```

Global requires stronger review.

Example:

```text
PASSAGE
```

may be approved by one reviewer.

```text
GLOBAL TERM MAPPING
```

requires multiple reviewers or maintainer approval.

---

# 62. Contribution IDs

Every contribution gets:

```text
contribution_id
```

Example:

```text
contrib_01J...
```

It stores:

```text
author
created_at
source
changes
status
reviewers
revision
```

---

# 63. Contribution Status

```text
DRAFT
SUBMITTED
VALIDATING
NEEDS_CHANGES
UNDER_REVIEW
APPROVED
REJECTED
MERGED
SUPERSEDED
```

---

# 64. Git Integration

A contribution should ultimately become a Git change.

Example:

```text
User contribution
       ↓
database draft
       ↓
review
       ↓
generated patch
       ↓
Git branch
       ↓
Pull Request
       ↓
CI
       ↓
merge
```

This makes the editorial history durable.

---

# 65. Git Is the Editorial Ledger

PostgreSQL can disappear.

Git history should still answer:

```text
Who changed this?
When?
What did they change?
Why?
What source did they use?
```

---

# 66. Git Commit Format

Example:

```text
content(manifesto): modernize ch01 p00017
```

Term:

```text
term(bourgeoisie): add capitalist class mapping
```

Source:

```text
source(manifesto): update source snapshot
```

---

# 67. Pull Request Template

Every PR should ask:

```text
What changed?

Which source passage changed?

What is the source URL?

Does the original remain unchanged?

Does the Plain English version preserve the original argument?

Were any terms changed?

Why?

Were historical/contextual claims sourced?

Was AI used?

If yes, was the output manually reviewed?
```

---

# 68. Automated CI

Every PR runs:

```text
schema validation
source alignment
duplicate ID detection
broken link detection
HTML validation
Markdown validation
YAML validation
JSON validation
anchor validation
rights metadata validation
```

---

# 69. Content Invariants

CI must reject:

```text
missing original
```

```text
duplicate passage ID
```

```text
invalid source locator
```

```text
plain text without source mapping
```

```text
published content with unknown rights
```

```text
broken internal link
```

---

# 70. Original Text Integrity Test

For every published passage:

```text
original_hash
```

is compared against the approved source snapshot.

If changed:

```text
BUILD FAIL
```

unless the source update is explicitly approved.

---

# 71. Plain English Structural Test

For each source passage:

```text
source ID exists
```

and:

```text
plain English mapping exists
```

if status is published.

The system rejects:

```text
p00017 → missing PE
```

unless explicitly marked:

```text
status: untranslated
```

---

# 72. Partial Translation Is Allowed

A document does not need to be completed in one PR.

Example:

```text
Chapter I
p00001 ✓
p00002 ✓
p00003 ✓
p00004 —
```

The reader sees:

```text
Plain English not yet available for this passage.
```

and can contribute.

---

# 73. AI Batch Generation

For large works, generation should happen in chunks.

Example:

```text
10–30 passages/job
```

not:

```text
entire Capital
```

This improves:

* reliability;
* reviewability;
* token limits;
* failure recovery;
* cost control.

---

# 74. AI Jobs

Database entity:

```text
AIJob
```

Fields:

```text
id
document_id
passage_ids
prompt_version
model
status
input_hash
output_hash
created_at
completed_at
```

Status:

```text
QUEUED
RUNNING
FAILED
COMPLETED
REVIEW_REQUIRED
```

---

# 75. AI Retry

Failed jobs must be retryable without losing previous results.

Never overwrite:

```text
AI output #1
```

with:

```text
AI output #2
```

Store both.

---

# 76. Explanation Layer

Explanation is not Plain English.

Example:

```text
Plain English:
"The capitalist class..."

Explanation:
"Here Marx is describing a class whose position..."
```

The second sentence may introduce interpretation.

Therefore it must be separately labeled.

---

# 77. Explanation Provenance

Every substantive explanation should optionally contain:

```text
sources[]
```

Example:

```yaml
sources:
  - type: "primary_text"
    passage_id: "..."
  - type: "secondary_source"
    citation: "..."
```

---

# 78. Historical Notes

Historical notes should not silently appear inside Plain English.

Instead:

```text
Historical context
```

card/panel.

This maintains the separation:

```text
What the text says
vs.
What we know about the context
```

---

# 79. Search Architecture

Search supports:

```text
authors
works
passages
terms
concepts
explanations
source metadata
```

Search results should identify the layer:

```text
ORIGINAL
PLAIN ENGLISH
VOCABULARY
EXPLANATION
```

---

# 80. Vocabulary Page

URL:

```text
/vocabulary/
```

Term:

```text
/vocabulary/bourgeoisie/
```

Should contain:

```text
Original term
Modern renderings
Definitions
Context
Works
Passages
Usage statistics
History
Sources
```

---

# 81. Reading Paths

Reading paths are data objects.

Example:

```yaml
id: path:foundation-marxism

title: "Foundation texts"

items:
  - work:...
  - work:...
```

They should be presented as:

```text
suggested path
```

not:

```text
officially correct sequence
```

---

# 82. Library Architecture

```text
/library/
    /marx/
    /engels/
    /lenin/
    /luxemburg/
    /trotsky/
    /bordiga/
    ...
```

The data model should not hardcode a particular political tradition.

Priority can be expressed through project roadmap and curated reading paths.

---

# 83. API Design

Base:

```text
/api/v1
```

---

# 84. Public API Endpoints

### Documents

```http
GET /api/v1/documents/{id}
GET /api/v1/documents/by-url
```

### Passages

```http
GET /api/v1/documents/{id}/passages
GET /api/v1/passages/{id}
```

### Terms

```http
GET /api/v1/terms/{slug}
GET /api/v1/terms/search?q=bourgeoisie
```

### Search

```http
GET /api/v1/search?q=...
```

---

# 85. Contribution API

```http
POST /api/v1/contributions
GET  /api/v1/contributions/{id}
PATCH /api/v1/contributions/{id}
POST /api/v1/contributions/{id}/submit
```

Authentication is required for write operations.

Reading does not require an account.

---

# 86. Source Ingestion API

```http
POST /api/v1/sources/import
```

Request:

```json
{
  "url": "https://www.marxists.org/..."
}
```

Response:

```json
{
  "source_document_id": "...",
  "status": "parsed",
  "blocks": 186
}
```

---

# 87. AI API

Internal/admin endpoint:

```http
POST /api/v1/ai/plain-english
```

Not public by default.

Input:

```json
{
  "document_id": "...",
  "passage_ids": ["p00017", "p00018"]
}
```

Output:

```json
{
  "job_id": "..."
}
```

---

# 88. Authentication

Reading:

```text
anonymous
```

Contribution:

```text
GitHub OAuth
```

is a practical initial solution.

The project should not store passwords if avoidable.

Future alternatives:

```text
GitLab
email magic links
passkeys
```

---

# 89. Anonymous Reading

No account required for:

* reading;
* searching;
* vocabulary;
* source comparison;
* dark mode;
* reader preferences.

---

# 90. User Preferences

Store locally where possible:

```text
theme
font size
line height
reader mode
card behavior
parallel width
highlight visibility
```

Use:

```text
localStorage
```

before introducing server-side profiles.

---

# 91. Privacy

Default philosophy:

```text
minimum data collection
```

Avoid mandatory:

* analytics;
* behavioral tracking;
* advertising;
* profile construction.

Contribution accounts necessarily require some metadata.

---

# 92. Abuse Prevention

Public contribution APIs need:

```text
rate limiting
CAPTCHA/Turnstile where appropriate
spam detection
payload limits
IP throttling
account throttling
```

Never expose raw infrastructure details to clients.

---

# 93. Moderation

Moderation should be editorial, not ideological.

Moderators evaluate:

* source accuracy;
* textual fidelity;
* contribution quality;
* spam;
* harassment;
* copyright;
* technical correctness.

They should not reject content merely because it presents an unpopular interpretation.

---

# 94. Editorial Governance

Recommended roles:

```text
Reader
Contributor
Reviewer
Maintainer
Technical Administrator
Rights Reviewer
```

Roles can overlap.

---

# 95. Two-Reviewer Rule

Recommended for:

```text
global term mappings
major explanations
historical notes
rights-sensitive materials
```

Ordinary typo corrections may require only one reviewer.

---

# 96. Term Governance

Global terms are potentially high-impact.

Therefore:

```text
suggestion
 ↓
discussion/review
 ↓
approval
 ↓
published mapping
```

Existing alternatives remain available.

---

# 97. Versioning

Content uses semantic versions where useful:

```text
major.minor.patch
```

But Git commit history remains authoritative.

API uses:

```text
/v1
```

Breaking API changes:

```text
/v2
```

---

# 98. API Compatibility

The frontend should consume the same API that external clients use.

Do not create:

```text
special undocumented frontend API
```

This makes future extension development significantly easier.

---

# 99. Caching

Public GET requests should be aggressively cacheable.

Example:

```text
Cache-Control:
public, max-age=..., stale-while-revalidate=...
```

Published passage data changes relatively infrequently.

---

# 100. CDN

Production architecture:

```text
User
 ↓
CDN
 ↓
Web/API
```

Static content should be edge-cacheable.

---

# 101. Database as Read Model

The database should be treated as:

```text
query/index/read model
```

not:

```text
sole editorial source
```

Build process:

```text
Git content
 ↓
validator
 ↓
database importer
 ↓
PostgreSQL
```

---

# 102. Disaster Recovery

If PostgreSQL is destroyed:

```text
Git
 ↓
rebuild
 ↓
database
```

If website is destroyed:

```text
Git
 ↓
deploy elsewhere
```

If GitHub disappears:

```text
Git clone / mirror
```

must remain sufficient.

---

# 103. Backup Strategy

Minimum:

```text
Git repository
Database daily backup
Object storage source snapshots
Release archives
```

Recommended:

```text
3 copies
2 different storage systems
1 geographically separate copy
```

---

# 104. Mirror Strategy

The project should support:

```text
primary host
secondary host
community mirrors
offline archive
```

This follows the general resilience philosophy demonstrated by MIA's mirror model. MIA itself documents multiple mirrors and provides guidance for mirroring its archive.

---

# 105. Static Export

Command:

```bash
npm run export
```

should produce:

```text
dist/
```

containing:

```text
HTML
CSS
JS
content
search index
```

A basic mirror should be able to host this on any ordinary web server.

---

# 106. API-Less Degraded Mode

The reader should continue to work for published content if the API is unavailable.

Architecture:

```text
API available
→ dynamic features

API unavailable
→ static published content
```

Vocabulary may fall back to bundled static data.

Contribution obviously requires the API.

---

# 107. Extension Degraded Mode

If the API is down:

```text
extension does nothing
```

It must not break the MIA page.

---

# 108. Performance Targets

Initial targets:

```text
LCP < 2.5 sec
TTFB < 500 ms
reader interaction < 100 ms
term card < 100 ms after local data available
```

These are targets, not absolute guarantees.

---

# 109. Accessibility

Required:

```text
WCAG 2.2 AA target
```

Support:

* keyboard navigation;
* screen readers;
* visible focus;
* sufficient contrast;
* reduced motion;
* scalable text;
* semantic HTML.

Term cards must be keyboard accessible.

---

# 110. Mobile UX

Mobile term card:

```text
bottom sheet
```

with:

```text
term
modern wording
short explanation
full explanation
source
```

Swipe/tap outside closes it.

---

# 111. Desktop UX

Default:

```text
floating contextual card
```

Optional:

```text
side panel
```

The preference is stored locally.

---

# 112. Reader Settings

Example:

```text
Reader
 ├─ Original
 ├─ Plain English
 ├─ Parallel
 ├─ Font size
 ├─ Line height
 ├─ Term highlighting
 ├─ Card behavior
 └─ Explanation density
```

---

# 113. Explain Mode

A user can click:

```text
Explain
```

on a passage.

The system displays:

```text
What the passage says
Key terms
Historical context
Related passages
Why the Plain English version uses this wording
```

It should not silently replace the source.

---

# 114. AI Explanation

AI-generated explanations may be offered experimentally.

They must be labeled:

```text
AI-assisted explanation
```

and should not be represented as source fact.

Human-reviewed explanations become ordinary editorial content.

---

# 115. Citation System

Every published explanation can cite:

```text
primary passage
source document
secondary source
```

Citation metadata:

```yaml
citation:
  title:
  author:
  publication:
  year:
  url:
  accessed_at:
```

---

# 116. Source Link UI

Every reader page should provide:

```text
View original source
```

This links directly to MIA.

The source link should preserve the exact source fragment where available.

---

# 117. Source Comparison

A future UI can show:

```text
MMRL
vs.
MIA
```

side by side.

This is especially useful when source drift is detected.

---

# 118. Contribution via Source Link

Ideal workflow:

```text
User finds a passage on MIA
        ↓
clicks browser extension
        ↓
"Modernize this passage"
        ↓
MMRL opens corresponding passage
        ↓
source automatically identified
        ↓
contribution form prefilled
```

This should be a primary future workflow.

---

# 119. "Copy-Paste Link" Contribution

The web app should also support:

```text
Paste source URL
```

as the universal fallback.

Example:

```text
[ Paste MIA URL ]

https://www.marxists.org/...
```

The server does the scraping.

The contributor does not have to manually identify:

* author;
* year;
* chapter;
* anchor;
* paragraph.

---

# 120. Source Preview

After scraping:

```text
Source detected

Author: Karl Marx
Work: Manifesto of the Communist Party
Year: 1848
Document: Chapter I

186 source blocks detected.

[Continue]
```

The user confirms before editing.

---

# 121. Source Selection

If a page contains:

* title;
* navigation;
* bibliography;
* multiple text sections;

the parser must clearly identify the content body.

Show:

```text
Detected content:
Chapter I
```

and allow manual correction.

---

# 122. Parser Confidence

Each ingestion receives:

```text
parser_confidence
```

Example:

```text
98%
```

This is not semantic correctness.

It means:

> confidence that the parser correctly identified the document structure.

---

# 123. Parser Failure

If confidence is low:

```text
Automatic import could not confidently determine
the document structure.

Please review the detected blocks.
```

Do not silently publish.

---

# 124. HTML Normalization

The parser must remove:

```text
navigation
ads
site chrome
tracking
unrelated footer
```

while preserving textual semantics.

Never normalize away:

* emphasis;
* quotations;
* footnotes;
* source links;
* headings;
* meaningful line breaks.

---

# 125. Content Diff

When source changes:

```text
OLD
vs.
NEW
```

display:

```text
added
removed
modified
unchanged
```

The editorial team can then determine whether Plain English mappings still align.

---

# 126. Source Change Workflow

```text
scheduled fetch
      ↓
hash comparison
      ↓
no change → finish

change
 ↓
diff
 ↓
mapping check
 ↓
review
 ↓
approve
 ↓
update
```

---

# 127. Scheduled Jobs

Required jobs:

```text
source health check
source drift detection
link checker
database rebuild
search index rebuild
backup
usage aggregation
```

---

# 128. Observability

Production should expose:

```text
uptime
API latency
error rate
source fetch failures
queue depth
database health
build failures
```

Do not expose contributor private information.

---

# 129. Logging

Logs must include:

```text
request ID
timestamp
endpoint
status
latency
error class
```

Avoid storing unnecessary:

```text
full reading history
full user text
personal information
```

---

# 130. Security

Minimum:

```text
HTTPS
secure cookies
CSRF protection
rate limiting
input validation
output encoding
SQL parameterization
dependency scanning
secret management
```

---

# 131. XSS Protection

This is particularly important because the system renders historical HTML.

Source HTML must be sanitized.

Never trust imported HTML.

Never render arbitrary contributor HTML directly.

Prefer:

```text
structured content → renderer
```

rather than:

```text
raw HTML → dangerously render
```

---

# 132. Markdown

Contributor Markdown must be sanitized before publication.

Allowed formatting should be explicitly defined.

---

# 133. API Validation

Use schemas:

```text
Pydantic
JSON Schema
OpenAPI
```

Every API request and response has a defined schema.

---

# 134. OpenAPI

The API should automatically publish:

```text
/api/docs
/api/openapi.json
```

for developers.

---

# 135. Extension API Contract

The extension only needs:

```http
GET /api/v1/source-map?url=...
```

Response:

```json
{
  "matched": true,
  "document_id": "...",
  "public_url": "...",
  "version": "..."
}
```

Then:

```http
GET /api/v1/documents/{id}
```

---

# 136. Passage-Level API

Example:

```http
GET /api/v1/documents/.../passages/p00017
```

returns:

```json
{
  "id": "p00017",
  "source_locator": "015",
  "original": "...",
  "plain_english": "...",
  "terms": [...]
}
```

---

# 137. Public Content API Versioning

Example:

```text
/v1/documents
/v1/passages
/v1/terms
```

Published API responses should remain backwards compatible.

---

# 138. Data Model

Core entities:

```text
Author
Work
Document
Source
SourceSnapshot
SourceBlock
Passage
PlainEnglishRevision
Term
TermMapping
Explanation
Citation
Contribution
Review
User
AIJob
ReadingPath
Release
```

---

# 139. Relationship Model

```text
Author
  ↓
Work
  ↓
Document
  ↓
SourceBlock
  ↓
Passage
  ├── PlainEnglish
  ├── TermMappings
  ├── Explanations
  └── Citations
```

---

# 140. Database Rule

Database records should always be traceable to:

```text
Git content
```

or:

```text
contribution state
```

There must be no mysterious database-only published content.

---

# 141. Published vs Draft

Database:

```text
draft tables
published tables
```

or equivalent status model.

Production API returns only:

```text
published
```

unless authenticated contributor/editor requests drafts.

---

# 142. Release Pipeline

```text
Git merge
 ↓
CI
 ↓
content build
 ↓
database migration/import
 ↓
static build
 ↓
deployment
 ↓
smoke tests
 ↓
release
```

---

# 143. Atomic Releases

A release should contain matching:

```text
web version
API version
content revision
database revision
```

Example:

```text
release: 2026.10.03
content commit: abc123
api: v1
web: 1.4.0
```

---

# 144. Rollback

If deployment breaks:

```text
previous release
```

must be restorable.

Database changes must be backward-compatible where possible.

---

# 145. Content Release Archives

Every major release can produce:

```text
content.tar.gz
content.json
manifest.json
checksums.txt
```

This allows external mirrors.

---

# 146. Manifest

Example:

```json
{
  "project": "Modern Marxist Reading Layer",
  "release": "2026.10.03",
  "content_revision": "abc123",
  "documents": 12,
  "passages": 4387,
  "generated_at": "..."
}
```

---

# 147. Community Mirrors

A third party should be able to:

```text
git clone
npm install
build
deploy
```

without contacting the founder.

---

# 148. Configuration

Environment-specific configuration:

```text
.env
```

must never be committed.

Example:

```text
DATABASE_URL
REDIS_URL
AI_API_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
S3_BUCKET
```

---

# 149. Local Development

Target:

```bash
git clone ...
docker compose up
```

Then:

```text
web → localhost
api → localhost
postgres → localhost
```

A new contributor should be able to start the project in under one hour.

---

# 150. Docker

Recommended services:

```text
web
api
postgres
worker
```

Redis should be optional.

---

# 151. Worker

Background worker handles:

```text
source ingestion
AI jobs
link checks
source drift
search indexing
statistics
```

---

# 152. Queue

Initial:

```text
PostgreSQL-backed queue
```

or:

```text
Redis
```

Later, if scale requires:

```text
RabbitMQ
SQS
```

Do not over-engineer the MVP.

---

# 153. MVP Architecture

MVP:

```text
Next.js
FastAPI
PostgreSQL
Git
GitHub Actions
CDN
```

No mandatory:

```text
Kubernetes
microservices
Redis
Kafka
Elasticsearch
GraphQL
```

---

# 154. Why Not Microservices?

The project is initially content-heavy and contributor-driven.

Microservices would create:

* deployment complexity;
* operational cost;
* more failure modes;
* harder contributor onboarding.

Start with a modular monolith.

Split services only when real scale requires it.

---

# 155. Modular Monolith

Internal modules:

```text
source
content
terms
contributions
users
search
ai
publishing
```

Each has clear interfaces.

They may later become independent services.

---

# 156. Cost Strategy

The architecture is deliberately cheap.

Initial infrastructure can fit on:

```text
one small VPS
+
CDN
+
Git hosting
+
object storage
```

The website should not require expensive GPU infrastructure.

AI costs are optional.

---

# 157. AI Cost Isolation

AI should never be required for reading.

Therefore:

```text
AI budget = contribution assistance
```

not:

```text
AI budget = website availability
```

If AI API funding disappears:

```text
reading continues
```

---

# 158. Donation Architecture

Create:

```text
/fund/
```

with transparent goals.

Example:

```text
Domain
$15/year

Hosting
$120/year

Backups
$60/year

Mirror infrastructure
$...
```

Actual figures should be updated from real invoices.

---

# 159. Donation Philosophy

Donations fund:

```text
infrastructure
```

not:

```text
access
```

The reader should never need to pay to access core texts.

---

# 160. Funding Transparency

Publish:

```text
income
expenses
current balance
upcoming expenses
```

where practical.

A simple ledger is sufficient.

---

# 161. Hosting Sponsorship

The project may accept:

```text
VPS sponsorship
CDN sponsorship
domain sponsorship
object-storage sponsorship
mirror hosting
```

But must avoid architectural dependency on one sponsor.

---

# 162. Founder Independence

The project is considered successful only if:

```text
founder disappears
       ↓
project continues
```

Required:

* public repository;
* documented deployment;
* public schemas;
* public build process;
* no private production-only content;
* no private API keys required to build;
* no founder-owned proprietary database.

---

# 163. Governance

Long-term:

```text
Maintainers
Technical team
Editorial reviewers
Rights reviewers
Community contributors
```

The repository should define how maintainers are added/replaced.

---

# 164. Bus Factor

Target:

```text
bus factor ≥ 3
```

At least three people should understand:

* deployment;
* content pipeline;
* database;
* source ingestion;
* release process.

---

# 165. Documentation Requirements

Required documents:

```text
README.md
ARCHITECTURE.md
CONTRIBUTING.md
EDITORIAL.md
LICENSING.md
DEPLOYMENT.md
API.md
SOURCE-INGESTION.md
AI-GUIDELINES.md
GOVERNANCE.md
SECURITY.md
DISASTER-RECOVERY.md
ROADMAP.md
```

---

# 166. Contribution Documentation

A first-time contributor should be able to understand:

```text
How do I add a term?

How do I modernize one paragraph?

How do I correct an error?

How do I run validation?

How do I submit a PR?
```

without contacting the maintainer.

---

# 167. Issue Templates

Required:

```text
Bug
Source correction
Plain English correction
Vocabulary correction
Historical context
Rights/copyright
Metadata
Feature request
Parser failure
```

---

# 168. Parser Test Suite

Every source parser requires fixtures.

Example:

```text
tests/fixtures/mia/communist-manifesto-ch01.html
```

Expected:

```text
186 blocks
expected anchors
expected headings
expected metadata
```

If MIA changes HTML:

```text
parser tests fail
```

before production changes.

---

# 169. Golden Files

Use golden normalized outputs.

Example:

```text
fixture.html
      ↓
parser
      ↓
normalized.json
```

The output is compared against the committed golden file.

---

# 170. AI Golden Tests

For AI, deterministic exact output is not assumed.

Instead test:

```text
schema validity
passage completeness
length bounds
required fields
forbidden structural changes
```

---

# 171. AI Human Review Interface

Reviewer sees:

```text
SOURCE
──────────────
Original paragraph

AI PLAIN ENGLISH
──────────────
Candidate rendering

TERM CHANGES
──────────────
bourgeoisie
→ capitalist class

WHY
──────────────
AI explanation

[Accept]
[Edit]
[Reject]
```

---

# 172. Diff UI

For revisions:

```text
old PE
vs.
new PE
```

Use character-level or word-level diff.

Original should always remain visible.

---

# 173. Semantic Review Checklist

Reviewer asks:

```text
Did the subject change?
Did the object change?
Did negation change?
Did modality change?
Did causality change?
Did qualification disappear?
Did terminology change?
Did historical meaning change?
```

---

# 174. Plain English Editorial Rule

Primary rule:

> Modernize vocabulary and syntax before modernizing concepts.

Example:

```text
archaic wording
→ contemporary wording
```

rather than:

```text
historical concept
→ contemporary ideology
```

The latter belongs in explanation/interpretation.

---

# 175. Terminology Rule

A term may have multiple valid renderings.

The system stores:

```text
source term
candidate rendering
context
reason
usage
review state
```

rather than a single global dictionary replacement.

---

# 176. No Blind Find/Replace

Never implement:

```text
bourgeoisie → capitalist class
```

as a global string replacement.

Why?

Because:

* morphology changes;
* context changes;
* capitalization matters;
* quotation boundaries matter;
* historical usage matters.

Term mapping must operate on spans/context.

---

# 177. Term Span Model

Example:

```json
{
  "term_id": "term:bourgeoisie",
  "passage_id": "p00017",
  "start": 45,
  "end": 56,
  "text_hash": "..."
}
```

The `text_hash` protects against stale span offsets.

---

# 178. Span Revalidation

If original text changes:

```text
span hash mismatch
```

then:

```text
TERM MAPPING → REVIEW REQUIRED
```

It should not silently highlight the wrong word.

---

# 179. Search Indexing Terms

Search should index:

```text
original
plain English
term names
aliases
explanations
metadata
```

But result ranking should clearly distinguish them.

---

# 180. Offline/PWA

Phase 5:

```text
Installable PWA
```

Users can download selected works.

Offline package:

```text
source
plain English
vocabulary
metadata
```

---

# 181. EPUB

Phase 5:

```text
Generate EPUB
```

Possible formats:

```text
Original
Plain English
Parallel
```

Each should preserve source metadata.

---

# 182. Browser Extension Roadmap

Phase 1:

```text
web application
```

Phase 2:

```text
extension
```

Phase 3:

```text
offline extension cache
```

The extension remains a client, not a separate platform.

---

# 183. Future Translation Layers

The data model should eventually support:

```text
English
Vietnamese
Spanish
German
French
...
```

without changing the source model.

Example:

```text
passage
├── original
├── en-modern
├── vi-modern
└── ...
```

---

# 184. Language Independence

Do not hardcode:

```text
plain_english
```

deeply into the database schema.

Prefer:

```text
rendering
language: en
register: contemporary
purpose: modernization
```

This permits:

```text
Vietnamese modernization
```

later.

---

# 185. Interpretation Layers

Future:

```text
Explanation
Interpretation
Historical context
Scholarly commentary
```

must remain separate objects.

This prevents one interpretation from masquerading as the source.

---

# 186. Concept Graph

Future concept graph:

```text
bourgeoisie
   ↓
capital
   ↓
wage labour
   ↓
commodity
   ↓
production
```

Nodes:

```text
concept
```

Edges:

```text
related_to
contrasts_with
depends_on
explained_by
appears_in
```

This should be additive to the passage model.

---

# 187. Analytics

Prefer aggregated, privacy-preserving metrics.

Useful:

```text
page views
term lookup count
popular works
contribution count
```

Avoid:

```text
individual reading profiles
```

unless explicitly introduced later.

---

# 188. Community Statistics

Examples:

```text
2,431 published uses
148 contributors
23 alternatives
17 works
```

These statistics describe the project.

They should not be framed as proof that an interpretation is theoretically correct.

---

# 189. Search Engine Optimization

Every document should have:

```text
stable title
canonical URL
description
OpenGraph metadata
structured data
```

But source and project attribution must remain clear.

---

# 190. Canonical Metadata

Example:

```html
<link
  rel="canonical"
  href="https://modernmarxist.org/archive/marx/works/1848/communist-manifesto/ch01.htm"
/>
```

---

# 191. Source Attribution

Reader pages display:

```text
Source:
Marxists Internet Archive

Original:
Manifesto of the Communist Party

Source URL:
...
```

MIA asks users who reuse material to credit the archive and include the URL; the project should therefore retain that provenance visibly.

---

# 192. Relationship to MIA

The project should describe itself as:

```text
A reading layer built around source materials from
archives such as the Marxists Internet Archive.
```

It should not imply:

```text
official MIA project
```

unless an actual formal relationship exists.

---

# 193. Source Archive Independence

The architecture must support:

```text
MIA
Archive.org
other lawful public-domain archives
user-provided sources
```

Each source provider has:

```text
provider adapter
```

---

# 194. Source Adapter Interface

```python
class SourceAdapter:
    def can_handle(url): ...
    def fetch(url): ...
    def parse(html): ...
    def extract_metadata(document): ...
    def extract_blocks(document): ...
```

---

# 195. Ingestion Adapter Registry

```text
MIAAdapter
ArchiveOrgAdapter
LocalFileAdapter
```

The ingestion engine chooses:

```text
adapter.can_handle(url)
```

---

# 196. Local File Import

For archival work, maintainers may import:

```text
HTML
TXT
EPUB
XML
```

through a controlled CLI.

Example:

```bash
mmrl import source.html
```

---

# 197. CLI

Useful commands:

```bash
mmrl validate
mmrl import
mmrl diff-source
mmrl build
mmrl export
mmrl check-links
mmrl generate-ai
mmrl migrate
```

---

# 198. Validation Command

```bash
mmrl validate
```

must check:

```text
schema
IDs
source mappings
anchors
terms
rights
links
content alignment
```

and return non-zero exit code on failure.

---

# 199. Developer Experience

Ideal:

```bash
git clone ...
docker compose up
mmrl validate
```

Then open:

```text
localhost
```

No hidden manual setup.

---

# 200. Deployment

Recommended initial deployment:

```text
Cloudflare / CDN
        ↓
Next.js
        ↓
API
        ↓
PostgreSQL
```

The exact provider is replaceable.

---

# 201. Hosting Independence

Do not use proprietary platform APIs as core content dependencies.

Git:

```text
portable
```

PostgreSQL:

```text
portable
```

Docker:

```text
portable
```

OpenAPI:

```text
portable
```

---

# 202. Database Migrations

Use:

```text
Alembic
```

or equivalent.

Every schema change:

```text
migration file
```

committed to Git.

---

# 203. Secret Management

Production secrets must be supplied through:

```text
environment variables
```

or a secret manager.

Never:

```text
commit API keys
```

---

# 204. Dependency Management

Automated:

```text
Dependabot/Renovate
security scanning
SBOM generation
```

---

# 205. Supply Chain

CI should pin:

```text
major dependencies
```

and ideally use:

```text
lockfiles
```

for reproducible builds.

---

# 206. Build Reproducibility

A release should be reproducible from:

```text
Git commit
+
lockfile
+
content
```

without private data.

---

# 207. Release Signing

Long-term:

```text
signed Git tags
```

can establish trusted releases.

---

# 208. Source Integrity

Source snapshots should include:

```text
SHA-256
```

and optionally:

```text
timestamp
retrieval metadata
```

---

# 209. Archive Package

A yearly or major-release archive can contain:

```text
content/
metadata/
schemas/
source manifests/
licenses/
checksums/
README
```

This becomes an archival artifact independent of the live website.

---

# 210. Disaster Scenario: Founder Disappears

Required recovery:

```text
clone repository
 ↓
install dependencies
 ↓
restore DB
OR
rebuild DB
 ↓
deploy
```

No private action should be necessary.

---

# 211. Disaster Scenario: Main Domain Lost

Repository should support:

```text
new-domain.example
```

without rewriting content.

Public URL configuration is external.

---

# 212. Disaster Scenario: Database Lost

```text
Git content
 ↓
import
 ↓
PostgreSQL rebuilt
```

---

# 213. Disaster Scenario: API Lost

Static export still works.

---

# 214. Disaster Scenario: AI Provider Lost

Reading and contribution remain operational.

Only:

```text
AI assistance
```

disappears.

---

# 215. Disaster Scenario: MIA Unavailable

Already imported, lawfully stored content remains usable according to its rights metadata.

New ingestion pauses.

The source URL remains recorded.

This is one reason original-source storage must be explicit.

---

# 216. Source Storage Policy

For each work choose:

```text
FULL_COPY
STRUCTURED_COPY
METADATA_ONLY
EXCERPT_ONLY
```

based on rights.

Never blindly mirror all external source content.

---

# 217. MIA Storage Policy

For public-domain source material:

```text
store locally
```

where legally appropriate.

For copyrighted/permission-restricted material:

```text
do not automatically copy
```

Instead store:

```text
source URL
metadata
rights information
hash
mapping information
```

unless permission permits local redistribution.

---

# 218. Editorial Independence

The project should preserve:

```text
source
```

while allowing:

```text
multiple modernization proposals
```

This is technically represented through versioned mappings.

---

# 219. Alternative Renderings

Example:

```text
Original:
bourgeoisie

Rendering A:
capitalist class

Rendering B:
bourgeois class

Rendering C:
bourgeoisie
```

All can coexist.

The selected rendering for a work/passage is simply:

```text
active mapping
```

---

# 220. Mapping Resolution Algorithm

Given:

```text
term
passage
work
```

resolve:

```text
1. passage mapping
2. work mapping
3. author mapping
4. global mapping
5. original term
```

The first approved mapping wins.

---

# 221. User Override

Future users may choose:

```text
Preferred terminology:
Keep original terminology
Use project default
Use community alternative
```

This can be a local preference without changing published content.

---

# 222. Personal Glossary

Future feature:

```text
My vocabulary
```

stored locally.

Users can say:

```text
I prefer "capitalist class"
```

without changing the global mapping.

---

# 223. Reading Progress

Local only initially:

```text
localStorage
```

Example:

```text
Manifesto
Chapter I
72%
```

No account required.

---

# 224. Bookmarks

Local:

```text
/bookmarks
```

No server storage required in MVP.

---

# 225. Contribution Discovery

When a reader reaches an untranslated passage:

```text
Plain English unavailable

[Suggest a modernization]
```

Clicking automatically carries:

```text
document ID
passage ID
source URL
original text
```

No copy-paste required.

---

# 226. Contribution Safety

Original text shown read-only.

Contributor edits only:

```text
Plain English field
```

This eliminates accidental source modification.

---

# 227. Contributor Editor

Editor layout:

```text
┌────────────────────────────────────┐
│ ORIGINAL                           │
│                                    │
│ source text                        │
├────────────────────────────────────┤
│ PLAIN ENGLISH                      │
│                                    │
│ editable text                      │
├────────────────────────────────────┤
│ TERMS                              │
│ bourgeoisie → capitalist class     │
├────────────────────────────────────┤
│ NOTES                              │
└────────────────────────────────────┘
```

---

# 228. Editor Validation

Live warnings:

```text
⚠ number changed
⚠ sentence missing
⚠ quotation changed
⚠ term span invalid
```

These are warnings, not automatic rejection unless structurally invalid.

---

# 229. AI Assist Button

Inside editor:

```text
Generate draft
```

AI sees only the current source passage plus relevant context.

It returns:

```text
draft
```

which the contributor edits.

---

# 230. AI Context Window

AI should receive:

```text
current passage
+
previous/next passage if needed
+
document metadata
+
approved terminology for this work
```

but not arbitrary unrelated content.

---

# 231. Terminology Context

Example:

```text
Approved in this work:
"means of production"
"wage labour"
```

AI should use existing project terminology consistently unless proposing a change.

---

# 232. AI Consistency Check

Before submission:

```text
term consistency checker
```

flags:

```text
capitalist class
vs.
capitalist class
```

and:

```text
capitalist class
vs.
capitalist ruling class
```

for review.

---

# 233. Semantic Guardrails

AI must preserve:

```text
not
never
only
except
unless
because
therefore
however
although
```

because these can radically alter arguments.

---

# 234. No Automatic "Simplification"

The AI must not:

```text
remove difficult concepts
```

because the purpose is:

```text
simpler language
```

not:

```text
simpler theory
```

---

# 235. Editorial Golden Rule

> **Dumb down the vocabulary, not the argument.**

This is an internal editorial principle, not an instruction to alter the source.

---

# 236. Explanation Golden Rule

> **Explain what the modernization cannot safely simplify.**

---

# 237. Source Golden Rule

> **If the reader wants to verify us, they must be able to reach the original immediately.**

---

# 238. Extension Golden Rule

> **The extension must be a thin client of the web platform.**

---

# 239. Sustainability Golden Rule

> **No component should be indispensable if it can be rebuilt from public project artifacts.**

---

# 240. MVP

The first release should contain:

```text
Repository
API
Web reader
PostgreSQL
Source ingestion
Communist Manifesto
Chapter I
Original mode
Plain English mode
Parallel mode
Term highlighting
Term cards
Vocabulary
Contribution workflow
AI-assisted draft generation
Human review
Git integration
CI validation
Source metadata
Rights metadata
Static export
```

---

# 241. MVP Explicitly Excludes

```text
browser extension
mobile native app
social network
comments
complex reputation system
full scholarly graph
microservices
Kubernetes
real-time collaboration
```

---

# 242. Phase 2

```text
browser extension
better term graph
community statistics
personal terminology preferences
offline/PWA
more works
```

---

# 243. Phase 3

```text
EPUB
mirrors
translation layers
advanced search
concept graph
scholarly annotations
```

---

# 244. Phase 4

```text
distributed governance
multiple maintainers
automated source monitoring
advanced archival releases
community mirror network
```

---

# 245. Foundation Content Strategy

The initial library should prioritize foundational texts according to the project's stated educational scope.

The technical system must not hardcode that priority.

Instead:

```text
reading paths
library metadata
roadmap
```

should express it.

This allows the same infrastructure to accommodate other texts and traditions.

---

# 246. Left-Communist Material

Left-communist texts can be added through:

```text
library metadata
reading paths
collections
```

rather than through a special code path.

Example:

```yaml
collection:
  id: left-communism
```

---

# 247. Collection Model

```text
Collection
├── title
├── description
├── documents[]
├── maintainers[]
└── references[]
```

---

# 248. Reading Path Model

```text
ReadingPath
├── title
├── description
├── items[]
└── rationale
```

The rationale should explain why the texts are grouped without pretending that the sequence is the only valid interpretation.

---

# 249. Roadmap Page

```text
/roadmap/
```

shows:

```text
NOW
NEXT
LATER
```

with GitHub issue links.

---

# 250. Funding Page

```text
/fund/
```

shows:

```text
Current balance
Monthly/annual expenses
Upcoming expense
Donation options
Hosting offers
Mirror offers
```

---

# 251. Hosting Offer

Allow:

```text
"Host a mirror"
```

with documented requirements.

Example:

```text
2 CPU
4 GB RAM
100 GB storage
daily backups
```

Actual requirements should be based on measured production usage.

---

# 252. Mirror Manifest

Every mirror can expose:

```text
/.well-known/mmrl-mirror.json
```

Example:

```json
{
  "project": "MMRL",
  "release": "2026.10.03",
  "content_revision": "abc123",
  "contact": "...",
  "last_sync": "..."
}
```

---

# 253. Mirror Discovery

Future:

```text
modernmarxist.org/mirrors
```

lists participating mirrors.

No mirror should be treated as inherently authoritative beyond release synchronization.

---

# 254. Synchronization

Mirrors can sync:

```text
Git
```

or:

```text
release archives
```

rather than directly scraping the production site.

---

# 255. Content Integrity Between Mirrors

Each release includes:

```text
checksums.txt
```

Mirrors verify the same release hash.

---

# 256. API Health

Health endpoint:

```http
GET /health
```

Readiness:

```http
GET /ready
```

---

# 257. Database Health

Readiness should verify:

```text
database connectivity
```

but not expose credentials/errors.

---

# 258. Monitoring

Use open-source or inexpensive tooling where possible:

```text
Prometheus
Grafana
Uptime Kuma
Sentry/self-hosted alternative
```

Exact selection is operational, not architectural.

---

# 259. Testing Pyramid

```text
             E2E
            /   \
        Integration
        /         \
      Unit       Parser
```

Highest priority:

```text
source parser
content validation
URL mapping
```

because these affect archival integrity.

---

# 260. End-to-End Test

Example:

```text
MIA URL
 ↓
import
 ↓
parse
 ↓
passage p00017
 ↓
plain English
 ↓
API
 ↓
web reader
 ↓
#015
```

must land on the correct passage.

---

# 261. Anchor Test

Test:

```text
/#015
```

resolves to:

```text
data-source-locator="015"
```

not merely:

```text
17th paragraph
```

---

# 262. Source Mapping Test

For every source locator:

```text
source locator → exactly one source block
```

unless source semantics explicitly require otherwise.

---

# 263. Duplicate Anchor Detection

If source contains:

```text
#015
#015
```

the importer must flag it.

---

# 264. Missing Anchor Detection

If a source paragraph has no anchor:

```text
source_locator = null
```

is allowed.

The internal passage still gets:

```text
p00017
```

---

# 265. Internal ID Stability

Once published:

```text
p00017
```

must never be reused for a different passage.

If a passage is deleted:

```text
p00017 = tombstoned
```

not recycled.

---

# 266. Passage Splitting

If:

```text
p00017
```

is split:

```text
p00017a
p00017b
```

retain a lineage record:

```text
derived_from: p00017
```

---

# 267. Passage Merging

If:

```text
p00017
p00018
```

merge:

```text
p00042
```

store:

```text
derived_from:
  - p00017
  - p00018
```

---

# 268. Editorial History

Every passage should expose:

```text
Revision history
```

where appropriate.

Example:

```text
Plain English v1
Plain English v2
Plain English v3
```

---

# 269. Reverting

Any previous published version can be restored through Git.

The API should never destroy historical content.

---

# 270. Content Deprecation

Instead of deleting important historical project data:

```text
deprecated
superseded
```

should be used.

---

# 271. Rights Withdrawal

If a rights issue arises:

```text
published → restricted
```

The project retains metadata and history where legally appropriate but removes prohibited content.

---

# 272. Copyright Takedown

Process:

```text
claim
 ↓
temporary review
 ↓
rights verification
 ↓
decision
 ↓
documented outcome
```

Do not rely on informal deletion by one maintainer.

---

# 273. AI Provider Independence

The AI interface should be provider-neutral:

```text
AIProvider
├── OpenAI
├── Anthropic
├── local model
└── future providers
```

---

# 274. Local AI

Future contributors may run models locally.

The task schema remains identical.

Thus:

```text
local model
```

can generate:

```text
same JSON contract
```

as a cloud model.

---

# 275. AI Cost Governance

Set:

```text
monthly budget
per-user limits
per-job limits
```

AI contribution must never create an uncontrolled bill.

---

# 276. Prompt Injection Defense

Imported source text must be treated as untrusted content.

A source passage saying:

```text
Ignore previous instructions...
```

must remain source text.

The AI system must distinguish:

```text
system instructions
task instructions
source content
```

---

# 277. AI Data Isolation

Contributor content should not automatically be used for model training.

The project must document provider data policies and configure APIs accordingly.

---

# 278. API Rate Limits

Example initial limits:

```text
GET:
high

POST contribution:
low

AI:
very low
```

Exact numbers should be load-tested.

---

# 279. Abuse-resistant AI

Do not expose unrestricted:

```text
"ask AI anything"
```

through the contribution API.

AI endpoints are task-specific:

```text
modernize passage
suggest term
explain passage
```

---

# 280. Content API Caching

Published content can be cached:

```text
document
passage
term
search result
```

Contribution drafts cannot be publicly cached.

---

# 281. API Authentication Boundary

Public:

```text
GET
```

Authenticated:

```text
POST
PATCH
DELETE
```

Admin:

```text
moderation
rights
release
```

---

# 282. Role Permissions

Example:

```text
Reader:
GET

Contributor:
GET + create contribution

Reviewer:
review/approve

Maintainer:
merge/publish

Admin:
infrastructure
```

---

# 283. Audit Log

Sensitive actions create:

```text
audit event
```

Examples:

```text
term approved
content unpublished
rights status changed
reviewer added
release created
```

---

# 284. Audit Log Retention

Editorial audit history should be long-lived.

Infrastructure logs can have shorter retention.

---

# 285. API Error Model

Standard:

```json
{
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "...",
    "request_id": "..."
  }
}
```

Never expose stack traces.

---

# 286. Frontend Error Handling

If API unavailable:

```text
The community features are temporarily unavailable.
The reader remains available.
```

---

# 287. Accessibility of Term Cards

Term card must support:

```text
Enter
Space
Escape
Tab
screen reader labels
```

---

# 288. Highlight Semantics

Use:

```html
<button>
```

or accessible interactive element.

Do not make:

```text
plain span
```

the only interaction.

---

# 289. Mobile Term Selection

Avoid accidental triggering when users merely select text.

Possible interaction:

```text
tap highlighted term → card
long press → browser selection
```

---

# 290. Reader Typography

Optimize for:

```text
long-form reading
```

rather than dashboard aesthetics.

The reader is the core product.

---

# 291. Interface Hierarchy

Priority:

```text
text
 ↓
navigation
 ↓
terms
 ↓
explanations
 ↓
community features
```

Community UI should never overwhelm the source.

---

# 292. No Gamification

Avoid:

```text
leaderboards
karma
badges for ideological activity
```

Contributions should be recognized through transparent history rather than gamified political competition.

---

# 293. Contributor Attribution

Published contributions may display:

```text
Contributor
Reviewer
Date
```

subject to contributor privacy settings.

---

# 294. Anonymous Contribution

Possible future feature:

```text
anonymous editorial contribution
```

where technically feasible.

The project should distinguish:

```text
anonymous publicly
```

from:

```text
anonymous to maintainers
```

---

# 295. Community Reputation

Do not introduce numerical contributor scores in MVP.

If reputation is eventually introduced, it should measure:

```text
technical/editorial contribution history
```

not ideological agreement.

---

# 296. Content Quality Metrics

Useful:

```text
reviewed
source verified
terminology reviewed
AI-assisted
human-reviewed
```

Avoid:

```text
"truth score"
```

---

# 297. Publication Badge

Example:

```text
✓ Source verified
✓ Human reviewed
✓ Plain English reviewed
```

This communicates process rather than ideological correctness.

---

# 298. Project Health Dashboard

Future:

```text
Documents: 48
Passages: 17,421
Translated: 13,202
Needs review: 481
Open contributions: 94
```

---

# 299. Coverage

Coverage can be measured:

```text
translated passages / total eligible passages
```

This is useful for prioritizing work.

---

# 300. Contribution Queue

Public page:

```text
/contribute/queue
```

shows:

```text
Most needed
Recently submitted
Needs reviewer
Untranslated
```

---

# 301. Priority Algorithm

Do not automatically prioritize based on ideological popularity.

Use transparent technical/editorial criteria such as:

```text
requested
incomplete
high reader traffic
source verified
easy review
```

---

# 302. Project Roadmap

## Phase 0 — Foundation

* repository;
* licenses;
* content schema;
* source parser;
* URL mapping;
* API contract;
* CI;
* deployment.

## Phase 1 — First Work

* *Communist Manifesto*;
* Chapter I;
* source ingestion;
* passage IDs;
* Plain English;
* vocabulary.

## Phase 2 — Reader

* term highlighting;
* cards;
* parallel mode;
* reader settings;
* source comparison.

## Phase 3 — Community

* contributions;
* Git integration;
* reviews;
* term mappings;
* usage statistics.

## Phase 4 — Archive

* additional Marx/Engels works;
* other foundational texts;
* additional traditions and collections.

## Phase 5 — Distribution

* browser extension;
* EPUB;
* PWA;
* mirrors.

## Phase 6 — Sustainability

* donations;
* hosting sponsorship;
* transparent expense ledger;
* backup/mirror program.

## Phase 7 — Long Term

* multilingual layers;
* scholarly annotations;
* concept graph;
* distributed governance.

---

# 303. First Implementation Milestone

Do NOT begin by building the entire archive.

Build one complete vertical slice:

```text
MIA Manifesto Chapter I
        ↓
source ingestion
        ↓
normalized blocks
        ↓
internal passage IDs
        ↓
Plain English
        ↓
term mapping
        ↓
API
        ↓
reader
        ↓
Git contribution
        ↓
CI
        ↓
deployment
```

If this works perfectly, scale horizontally.

---

# 304. First Vertical Slice Acceptance Test

A user should be able to:

1. Open the MMRL version of Chapter I.
2. Click a source-compatible anchor such as `#015`.
3. See the correct passage.
4. Switch Original / Plain English / Parallel.
5. Click a highlighted term.
6. See its explanation.
7. See alternative terminology.
8. See usage counts.
9. Click "Suggest modernization."
10. Submit a change.
11. Have CI validate it.
12. Have a reviewer approve it.
13. See it published.
14. Reproduce the entire result from Git.

If all fourteen work, the architecture is viable.

---

# 305. Definition of Done — Content

A work is considered published when:

```text
source verified
rights verified
metadata complete
passages mapped
original integrity verified
Plain English reviewed
terms reviewed
anchors validated
links validated
Git history present
API indexed
reader published
```

---

# 306. Definition of Done — Infrastructure

The system is production-ready when:

```text
deploy documented
backup tested
restore tested
API documented
CI operational
monitoring operational
security baseline complete
static export works
database rebuild works
```

---

# 307. Definition of Done — Sustainability

The project is sustainable when a new maintainer can:

```text
clone repository
read documentation
run locally
deploy staging
restore database
publish content
manage contributions
```

without requiring the founder.

---

# 308. Final Architecture

The final architecture is therefore:

```text
                         EXTERNAL SOURCES
                    ┌──────────────────────┐
                    │ MIA / other archives │
                    └──────────┬───────────┘
                               │
                         URL ingestion
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Source Adapter Layer │
                    └──────────┬───────────┘
                               │
                    normalized source blocks
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Git Content Source   │
                    │                      │
                    │ Original             │
                    │ Plain English        │
                    │ Terms                │
                    │ Explanations         │
                    │ Metadata             │
                    └──────────┬───────────┘
                               │
                      validation/build
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       ┌─────────────────┐           ┌─────────────────┐
       │ PostgreSQL      │           │ Static Export   │
       │ Read Model      │           │ Mirror Package  │
       └────────┬────────┘           └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Content API     │
       └────────┬────────┘
                │
       ┌────────┼─────────────┐
       ▼        ▼             ▼
     Web      Extension     Future Apps
       │
       ▼
    Reader
       │
       ├── Original
       ├── Plain English
       ├── Parallel
       ├── Terms
       └── Explanations
```

---

# 309. The Most Important Architectural Decision

The most important decision is not:

```text
Next.js vs React
FastAPI vs Node
Postgres vs another database
```

It is this:

> **The source text, internal passage identity, modernization, terminology, and interpretation must be separate pieces of data with explicit relationships.**

If this is done correctly, almost every future feature becomes possible without rebuilding the foundation.

---

# 310. Final System Rules

The project should permanently enforce these rules:

### Rule 1

**Never overwrite original text.**

### Rule 2

**Never treat MIA's `#015` or similar source anchor as an internal paragraph ID.**

### Rule 3

**Every source block gets a stable internal identity.**

### Rule 4

**Every modernization maps explicitly to source content.**

### Rule 5

**AI returns structured data, never uncontrolled prose blobs.**

### Rule 6

**AI output never publishes automatically.**

### Rule 7

**Global terminology is a reviewed mapping, not a blind find/replace.**

### Rule 8

**Usage count represents community usage, not objective correctness.**

### Rule 9

**The source URL is always one click away.**

### Rule 10

**The Git repository remains sufficient to reconstruct the system.**

### Rule 11

**The API is a service layer, not the ultimate source of truth.**

### Rule 12

**Static export must remain possible.**

### Rule 13

**The browser extension consumes the same API as the web application.**

### Rule 14

**Rights are recorded per source/work and never assumed globally.**

### Rule 15

**No single hosting provider, AI provider, database instance, or founder is allowed to become a single point of failure.**

---

# 311. Architectural Verdict

The resulting system is best described as:

> **An open-source, API-first, Git-backed, archival reading platform with a structured modernization layer.**

Not:

```text
AI chatbot for Marxism
```

Not:

```text
Wikipedia for Marxism
```

Not:

```text
a social network
```

Not:

```text
a static collection of rewritten books
```

Instead:

```text
SOURCE ARCHIVE
      +
STRUCTURED TEXT MODEL
      +
MODERN READING LAYER
      +
COMMUNITY EDITORIAL WORKFLOW
      +
OPEN API
      +
ARCHIVAL/DISTRIBUTION INFRASTRUCTURE
```

That is the architecture that should be treated as the project's foundation.
