# Task 010 — Term system: tokens, resolver, vocabulary

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 004 |

## Goal
Implement the term system from SDD §6 in `packages/terms`.

## Scope
- **Token parser.** Supports:
  - `{term}` — plain token;
  - `{term:form}` — a specific form;
  - `{Term}` — capitalized output;
  - `{term=rendering}` — pinned to one rendering;
  - `\{` — a literal brace.

  Parse errors report their position.
- **Resolver.** Picks the wording in this order:
  1. a pin on the token;
  2. the reader's preference;
  3. a scoped default (work, then author);
  4. the global default.

  It also handles capitalization.
- **`plm validate` hooks.** Reject:
  - unknown terms or forms;
  - alternatives that are missing a declared form;
  - alternatives whose grammatical number doesn't match.
- **Usage counts.** For each rendering, count the published tokens that display it by default.
- **Initial vocabulary for Ch. I.** Terms such as bourgeoisie, proletariat, means of production, guild-master, journeyman and feudal. Each needs definitions, alternatives, reason/limitation and a default.
- **`original-terms.yml` for Ch. I.**

## Acceptance
- Unit tests cover every token form, the resolution order and capitalization.
- The Ch. I vocabulary and annotations pass validation.

## Notes (on completion)
- `packages/terms` contains the token parser, resolver (pin → reader preference → work/author default → global default, with `original` as a preference), `renderTokens`, `checkTokens` and `usageCounts`. It is runtime-agnostic, so the reader can use it in the browser.
- `plm validate` now checks every token in every rendering (`term/token`).
- Annotation matching is now **whole-word**, so "bourgeois" no longer matches inside "bourgeoisie".
- New `plm annotate <document-dir>` marks whole-word occurrences of each term's original forms and aliases, longest match first, and keeps any existing hand-made annotations.
- Vocabulary for Ch. I: 15 terms. Three have a modern default (bourgeoisie → capitalist class, proletariat → working class, class antagonism → class conflict). The other twelve are kept as written and explained on the card. Engels's 1888 notes supply the definitions of bourgeoisie, proletariat and guild-master, with citations.
- 172 annotations in Ch. I. With 84 of them on "bourgeoisie", highlighting may feel busy; task 015 includes a highlight-visibility setting.
