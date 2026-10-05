# Task 034 — Term senses by author and period

| | |
|---|---|
| **Status** | Open (design; waits for the maintainer's direction decision) |
| **Filed** | 2026-10-05 |
| **Owner** | Unassigned |
| **Severity** | High once a second author is imported |
| **Milestone** | M3 (archive growth) |
| **Depends on** | 010, 022 (term cards) |
| **Related** | 032 B (concordance), 033 (German layer) |

## Problem
The term system was built for one text. A card has **one definition**. Only the Plain English *wording* can differ by work or author (`scoped_defaults`, scopes `work:…` and `author:…`).

As soon as more authors and periods are added, the same word means different things, and one definition becomes wrong for some texts. Examples from the tradition the maintainer plans to build next:

| Word | Marx & Engels, 1848 | Lenin | Council communists, De Leon |
|---|---|---|---|
| party | a political current or movement, not an organisation | the vanguard organisation | "The revolution is not a party matter" (Rühle); De Leon: the political arm of the industrial union |
| dictatorship of the proletariat | class rule; Engels later points to the Paris Commune | in practice, rule by the party | rule by workers' councils |
| socialism | in the Manifesto, mostly middle-class reform schools | the lower phase of communism | the workers' own management of production |
| union | — | — | industrial union (De Leon); distrust of unions (councilists) |

Translators also differ: the same German word gets different English words in different translations.

## Goal
A term card shows **the sense used in the text being read first**, then, on request, how other authors or periods used the word. The cards become a tool for comparing traditions, not only a dictionary.

## Proposed design (to be decided)
1. **Senses** on a term file: `senses: [{ scope, short, long?, sources }]`. The scope uses the existing `TermScope` (`work:…`, `author:…`), plus a new period scope such as `period:1848-1895`. The existing `definition` stays as the general sense, so cards without senses behave as today.
2. **Resolution:** the most specific scope matching the current work wins (work, then author, then period, then general). This is the same order as `scoped_defaults`.
3. **Card:** "In this text" (the matching sense) first, then "How others used this word" (the other senses, each labelled with its scope and sourced). The vocabulary page shows all senses.
4. **Neutral and descriptive:** a sense says how an author used the word, with sources. Judging which use is right belongs in labelled Context, not on the card (SDD §8.6).
5. **Persisted shape:** bump `schema_version`, ship the `plm migrate` step, and add optional data contract fields (backward-compatible).
6. **Checks:** a sense must have at least one source; scopes must name existing works or authors.

## Out of scope
- Rewriting existing cards before a second author exists.
- Per-translator renderings of the Original (handled by each work's own translation).

## Acceptance
- A card used in two works by different authors shows each work's own sense first.
- Old term files (no senses) load and show as before.
- `pnpm check` and `pnpm e2e` pass; SDD §6 and §12 are updated.
