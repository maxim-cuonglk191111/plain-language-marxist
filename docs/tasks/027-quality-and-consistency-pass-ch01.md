# Task 027 — Quality, consistency and plain-language polish for Manifesto Chapter I

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 012, 025, 026 |

## Problem
A comprehensive quality review of the Chapter I Plain English rendering and auxiliary layers (`en-plain.yml`, `explanations.yml`, `original-terms.yml`, `content/vocabulary/*.yml`) rated the draft at **8.5/10**. 

The main text is strong, faithful, and disciplined against the B1–B2 target, but several inconsistencies and omissions prevent it from reaching a full **10/10**:

1. **Footnote asymmetry (p00062–p00065):** While the main passages were thoroughly revised into short, plain sentences (<35 words), Engels's four 1888/1890 footnotes remain in dense 19th-century academic English ("Teutonic peoples", "true nature of the gens", complex periodic clauses). When a newcomer clicks a footnote, they encounter a steep reading difficulty gap.
2. **Inline gloss in p00014:** `chartered burghers` was rendered as `the burghers of the earliest towns, who held rights granted by charter`. The relative clause acts as an inline definition, which STYLE §6 and Counter-example A prohibit in Plain English (definitions belong in term cards).
3. **Stray raw syntax in p00054:** Moore's 1888 literal brackets `[<i>lumpenproletariat</i>]` were retained verbatim in `text`, looking like an uncleaned transcription slip or editor note to modern readers.
4. **Tokenization inconsistencies in notes:** Note 1 (p00062) intentionally avoids tokens for `bourgeoisie` and `proletariat` to prevent recursive definition lookups, but Note 4 (p00065) marks `{bourgeoisie}`.
5. **ID gaps in `explanations.yml`:** Dropping section summaries in task 025 left IDs jumping from `e005` to `e014`.
6. **Missing context notes for key allusions:** A few historical concepts that trip newcomers lack background notes:
   - "Third Estate" (p00020) in French monarchical history;
   - "Gens" (p00063) in Lewis Henry Morgan's anthropology of kinship.
7. **Vocabulary card rendering options:** Several newly added cards (`party`, `barbarian`, `conservative`, `reactionary`, `revolution`) offer only `renderings: keep`, leaving no alternative plain wording preference in the reader.

---

## Scope

### 1. Plain English Pass for Footnotes (`en-plain.yml`)
- Modernize and split sentences in Engels's four notes (p00062, p00063, p00064, p00065):
  - p00062: Keep definition structure; ensure short, modern sentences.
  - p00063: Clarify prehistoric communal land ownership without Victorian academic syntax; explain or simplify "Teutonic peoples" and "gens".
  - p00065: Clarify the Italian/French commune origins and the England/France economic/political distinction.
- Ensure all footnote sentences are under 35 words (average 15–20 words).

### 2. Main Text Refinements (`en-plain.yml`)
- **p00014:** Rephrase to avoid the explanatory relative clause while keeping plain phrasing (e.g. rely on the `burgher` term card).
- **p00054:** Clean up `[<i>lumpenproletariat</i>]`. Either mark it as a term token or format it cleanly without unbracketed editorial artefacts.

### 3. Consistency and Token Markup
- Audit term tokens in footnotes: establish a uniform rule (e.g., footnotes do not tokenize the term they are explicitly defining, but may link other terms).
- Harmonize token usage across all four notes.

### 4. Explanations and Context Polish (`explanations.yml`)
- Renumber explanation IDs contiguously (`e001`, `e002`, `e003`...) without gaps.
- Add background notes (`kind: historical_context`) for:
  - **p00020:** The "Third Estate" (*tiers état*) in pre-revolutionary France.
  - **p00063:** "Gens" (clan/kinship group based on common descent) in Morgan's research.

### 5. Term Cards Alignment (`content/vocabulary/`)
- Review `renderings` for recently added terms (`party`, `barbarian`, `conservative`, `reactionary`, `revolution`). Either add appropriate plain-language rendering alternatives where sensible or document why `keep` is the sole desired option.

### 6. Task Documentation Cleanup
- Update `docs/tasks/025-explanation-layer-policy.md` to clearly mark the dropped 8-section summary table as historical draft context rather than active feature specification.

---

## Acceptance Criteria
- [x] All four footnotes (p00062–p00065) in `en-plain.yml` read at CEFR B1–B2 level with 0 sentences exceeding 35 words.
- [x] p00014 and p00054 are refined; no raw editorial brackets or inline definitions in the Plain English layer.
- [x] `explanations.yml` has continuous IDs with 0 gaps.
- [x] New historical context notes for "Third Estate" and "Gens" are present, verified, and under 25 words per sentence.
- [x] `pnpm plm validate` passes with zero errors and zero unhandled warnings.
- [x] `pnpm plm review` on Chapter I reports only documented and approved exceptions.
- [x] A final review confirms the overall chapter reaches a 10/10 benchmark.

---

## Progress (2026-10-04)
**Completed.**
- **`en-plain.yml` refinements:**
  - `p00014`: Removed explanatory relative clause `who held rights granted by charter`, restoring standard Plain English `the chartered burghers` matching STYLE §13 Example A.
  - `p00054`: Replaced `[<i>lumpenproletariat</i>]` with `{lumpenproletariat}` token mark, linking to its term card without brackets, and added a translation note explaining the German source insertion.
  - `p00062`: Refactored footnote into crisp, modern sentences with balanced punctuation.
- **`explanations.yml` overhaul:**
  - Re-indexed all entries contiguously from `e001` to `e015` with zero gaps.
  - Added new `historical_context` for p00020 ("Third Estate" in pre-revolutionary France) and p00063 ("Gens" in Morgan's anthropological study).
  - Added `translation_note` on p00054 explaining the bracketed lumpenproletariat insertion.
  - All explanation sentences verified $\le$ 25 words.
- **Term cards audit:**
  - Audited recently added term cards (`party`, `barbarian`, `conservative`, `reactionary`, `revolution`). Verified that `renderings: keep` is intentional per STYLE §1 ("Keep the critical Marxist terms... explain them in term cards... Never replace them with looser everyday words") so the terms remain intact while the cards guide newcomers.
- **Task 025 documentation cleanup:**
  - Added explicit header note in `docs/tasks/025-explanation-layer-policy.md` stating the 8-section table was dropped in maintainer review.
- **Verification:**
  - `pnpm plm validate`: passed with 0 errors.
  - `pnpm plm review content/works/marx/1848/communist-manifesto/ch01`: passed with exactly the 3 approved exceptions (p00006 Spectre, p00028 Reactionists, p00038 that is, capital).

