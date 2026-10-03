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

**Check warnings left, each explained:**
- **p00008 `names`, "Proletarians".** The heading uses the class tokens, `{Bourgeoisie} and {Proletariat}`. Matching "Proletarians" would give "Capitalist class and Workers", which is lopsided. Engels's note 1 on this heading defines the two classes, so naming the classes keeps the meaning.
- **p00028 `names`, "Reactionists".** This is a capitalised common noun, not a name; it is rendered as "reactionaries".
- **p00038 `gloss`.** "the {bourgeoisie}, that is, capital" is the source's own "i.e., capital", not an added definition.

**Choices the reviewer should look at:**
- **"The bourgeois" meaning people.** The term has no form for persons. Where a word for a person is needed, the drafts use `{bourgeoisie:adj}` as a noun ("the individual {bourgeoisie:adj} who directly exploits them"). Otherwise they rephrase to the class ("the modern {bourgeoisie}", "individual members of the {bourgeoisie}"). A future `person` form on the term would allow a closer match.
- **"The petty bourgeois"** (p00045, p00060) is kept as a plain phrase, not tokenised; petty bourgeoisie is not a vocabulary term yet.
- **p00055** turns the singular "the proletarian … his wife and children" into the plural, because the token has no singular-person form.
- **p00062 (note 1)** keeps the words "bourgeoisie" and "proletariat" without tokens, because the note defines those words.

**Still open for this task:**
- Maintainer review against SDD §9.3, ideally with a second reader.
- Historical-context explanations (for example Metternich and Guizot, the ten-hours' bill), which are not drafted yet.
