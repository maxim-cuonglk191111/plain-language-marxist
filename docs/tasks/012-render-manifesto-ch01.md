# Task 012 — Plain English rendering of Manifesto Chapter I

| | |
|---|---|
| **Status** | In progress |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 009, 011 |

## Goal
Complete, reviewed Plain English for Ch. I. This chapter is the project's first impression, so quality matters more than speed.

## Scope
- Write renderings with `plm prompt` / `plm apply` or by hand, following the style guide (task 005). Declare `ai_assisted` honestly.
- Use term tokens throughout.
- Add a few explanations (historical context) where passages need them, kept separate from the Plain English text.
- Review every passage against the checklist in SDD §9.3. Get at least one second reader if possible.
- Submit in batches of 10–20 passages per PR, with commit messages like `content(manifesto/ch01): render p000xx–p000yy`.

## Acceptance
- Every Ch. I passage has a rendering, and `plm validate` reports nothing.
- No check warnings are left unresolved: each one was either fixed or explained in its PR.

## Progress (2026-10-04)
**Draft complete; waiting for the maintainer's review.** All 65 passages (p00001–p00065: title, preamble, Ch. I and Engels's notes 1–4) are rendered with `plm apply --ai`. All are marked `ai_assisted: true` and use term tokens. `plm validate` is clean. Branch: `content/manifesto-ch01-render`, one commit per batch.

**Translation notes** (`explanations.yml`, e001–e005). The STYLE §10 transcription slips in MIA's text are rendered by their evident meaning, and each is noted:

| Passage | MIA has | Rendered as |
|---|---|---|
| p00017 | manufacturer | manufacture |
| p00034 | adapted in it | adapted to it |
| p00035 | the bourgeois and of its rule | the bourgeoisie |
| p00055 | modern industry labour | modern industrial labour |
| p00060 | process of industry | progress of industry |

The Moore readings come from the drafter's knowledge of the 1888 text. **Check them against a scan before publishing.**

**Plainer vocabulary (2026-10-04).** The maintainer asked whether not knowing "spectre" meant their English was weak. It does not: the word is rare and literary. A pass over the drafts replaced words that readers learning English would need a dictionary for, while keeping every image and claim. STYLE rule 9 was updated to match.

| Passage | Before | After |
|---|---|---|
| p00002, p00006 | spectre, cast out | ghost, drive out |
| p00022 | idyllic, ecstasies, chivalrous, unscrupulous, veiled, substituted | peaceful old, joys, knightly, heartless, hidden, put in place of |
| p00023 | reverent awe | deep respect |
| p00028 | cosmopolitan, interdependence | worldwide, dependence of all nations on each other |
| p00032 | canalisation, an inkling | turning rivers into canals, suspected |
| p00039 | appendage, knack, repulsive, toil | attachment, skill, unpleasant, hard work |
| p00040 | despotism, embittering | tyranny, bitter |
| p00060 | pauper, pauperism, antagonism | sinks into extreme poverty, poverty, opposition |

**Check warnings left, each explained:**
- **p00006 `names`, "Spectre".** Capitalised in the source as part of "the Spectre of Communism", but not a name; now "the Ghost of Communism".
- **p00028 `names`, "Reactionists".** This is a capitalised common noun, not a name; it is rendered as "reactionaries".
- **p00038 `gloss`.** "the {bourgeoisie}, that is, capital" is the source's own "i.e., capital", not an added definition.

**Choices the reviewer should look at:**
- **People, not the class** (revised after task 022 added person forms): p00008, p00017, p00044, p00045 and p00046 now use `{bourgeoisie:person}` / `{bourgeoisie:persons}`. The heading reads "Capitalists and Workers" by default, or "Bourgeois and Proletarians" with original terms, which also clears the p00008 `names` warning. Elsewhere `{bourgeoisie:adj}` is used only as an adjective.
- **"The petty bourgeois"** (p00045, p00060) stays as written. Since task 022, petty bourgeoisie is a kept term with its own card, so it is clickable in Plain English.
- **p00055** keeps the singular "the proletarian … his wife and children" with `{proletariat:person}`.
- **p00062 (note 1)** keeps the words "bourgeoisie" and "proletariat" without tokens, because the note defines those words.

**Still open for this task:**
- Maintainer review against SDD §9.3, ideally with a second reader.
- Historical-context explanations (for example Metternich and Guizot, the ten-hours' bill), which are not drafted yet.
