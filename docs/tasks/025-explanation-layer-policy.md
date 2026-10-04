# Task 025 — Explanation layer: what it is for, how much to explain, and a plain-language review

| | |
|---|---|
| **Status** | In progress |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 012, 022, 023 |

## Problem
The maintainer noticed that the Explanation layer does not explain anything. Its only content in Ch. I is five *translation notes* about slips in MIA's transcription. Those are notes about the text, not about the ideas, and a reader who opens "Explanation" expecting help with a hard paragraph finds nothing useful.

The layer exists to help readers **understand** (SDD §1, §5.7): historical context, references a newcomer cannot know, and what a part of the argument is doing. It is always labelled as interpretation. The question is how much to explain without burying the text.

## Decision: the balancing point
**Explain by section, and add a passage note only where a newcomer would get stuck.**

1. **Section explanations.**
   - Ch. I has about eight parts (below). Each gets one short explanation: 3–6 sentences in STYLE §15 language. It says what this part argues and how it connects to the last one.
   - An explanation's `targets` covers every passage in the section, and the reader shows it once, at the section's first row.
   - It does not retell the paragraphs (that is the Plain English's job), and it does not judge whether Marx and Engels were right.
2. **Passage notes, selectively.** Write one only if the answer to this question is yes:

   > *Would a careful newcomer, reading the Plain English, get stuck here for lack of outside knowledge?*

   - **Typical cases:**
     - people (Metternich, Guizot, "Pope and Tsar");
     - events (the rounding of the Cape, the ten-hours' bill, the Trades' Unions);
     - images that rely on background ("Chinese walls", the sorcerer, "Exoduses of nations and crusades").
   - **Terms never get a note:** they have cards (task 022).
   - **Rough guide:** one note per 4–6 paragraphs on average, never one per paragraph. If every paragraph seems to need a note, the Plain English is not plain enough; fix that instead.
3. **Interpretation and commentary** (later history, debates, whether a prediction came true) stay a separate, attributed kind. They are optional and out of scope for M1.

## Translation notes move to the Original
- Translation notes are about the source text, so they show **beside the Original passage** as a small "Text note" marker that opens on click.
- They are no longer in the Explanation column, which becomes purely about understanding.
- No data change is needed: the reader places a note by its `kind`.

## Notes on weaknesses of the Plain English: no
- Do **not** add notes listing where the Plain English is weaker than the original. It would add complexity for little gain:
  - the Original is always one click away;
  - each wording choice already states its limitation on its term card (`limitation`).
- **Single exception:** where an original sentence can honestly be read two ways and the Plain English has to pick one, add a translation note on that passage. Expect 0–3 in Ch. I.

## Plain-language review (run 2026-10-04 on the Ch. I draft)
- **Rare words.** The first pass is done: spectre → ghost, cosmopolitan → worldwide, appendage, pauper and others (see task 012). STYLE rule 9 now says to keep images but use common words. A second pass is part of the maintainer's review.
- **Sentence length.**
  - The average is 20.7 words (median 19), which is fine.
  - But **38 of 225 sentences are over 30 words and 13 are over 40**, for example p00051 (65), p00032 (57), p00045 (56), p00033 (54) and p00059 (54).
  - That is hard for readers learning English. Split them, keeping every clause and logical link (STYLE example 2 allows splitting sentences, never passages).
  - Add a `plm` check warning for Plain English sentences over 35 words, so new drafts are caught.
- **Term cards** already meet STYLE §15 (task 022) and are waiting for an audience read.

## Proposed sections for Ch. I

| # | Passages | Section | What the explanation covers |
|---|---|---|---|
| 1 | p00002–p00007 | Preamble | Europe in 1848: who Metternich and Guizot were, why "communist" was used as an insult, why a manifesto now |
| 2 | p00009–p00013 | History as class struggle | The claim, the examples, the "simplification" into two classes |
| 3 | p00014–p00020 | How the bourgeoisie rose | Trade, then manufacture, then Modern Industry; political power following economic power |
| 4 | p00021–p00032 | What the bourgeoisie has done | Its "revolutionary" role: world market, cities, productive forces. Praise and accusation together |
| 5 | p00033–p00036 | Crises | Productive forces outgrowing property relations; over-production |
| 6 | p00037–p00043 | The proletariat's conditions | Labour as a commodity, deskilling, the middle strata sinking |
| 7 | p00044–p00051 | How the workers' struggle develops | From machine-breaking to unions to a national, political struggle |
| 8 | p00052–p00061 | Why the proletariat, and the conclusion | "Grave-diggers": the argument the chapter has been building |

## Scope
- **Reader:**
  - Show a section explanation once, at its first row, in the Explanation column; on phones, as the first thing in that row.
  - Show translation notes beside the Original.
- **Content:**
  - 8 section explanations, plus about 10 selective passage notes, for Ch. I.
  - All AI-assisted drafts go to the maintainer for review.
- **Plain English:** split the long sentences above, and add the >35-word check.
- **Docs:** add the "would a newcomer get stuck?" test and the rough guide to STYLE §15. Note the change of placement for translation notes in SDD §5.7.

## Acceptance
- The Explanation layer helps with understanding: every section has an explanation, and the passage notes pass the "stuck" test.
- Translation notes appear beside the Original, not in the Explanation column.
- No Plain English sentence is over 40 words; any over 35 are flagged and justified.
- `pnpm check` and `pnpm e2e` pass, and a reader from the target audience has tried the chapter.

## Progress (2026-10-04)
**Built.** What is still open: the maintainer's review of the AI-assisted context, and a try-out with a reader from the target audience.

- **Name.** At the maintainer's suggestion, the layer is now called **Context** in the reader: "Explanation" promised something the layer is not. Data files keep their names (`explanations.yml`, `kind: explanation`), so nothing needed migrating. Old `?layers=explain` links still work.
- **Reader** (on `main`):
  - A section explanation shows once, labelled "About this section", with a light background.
  - `historical_context` is labelled "Background".
  - Translation notes sit beside the Original as a "Text note" that opens on demand.
- **Checks:**
  - `plm` warns on Plain English sentences over 35 words (`long-sentence`);
  - `plm validate` warns on explanation sentences over 25 words.
  - STYLE §15 gained "How much context to give".
- **Content** (on the `content/manifesto-ch01-render` branch, all marked AI-assisted):
  - **8 section explanations**, following the table above.
  - **6 background notes**: Pope and Tsar, Metternich and Guizot (p00002); the Cape (p00015); Exodus and crusades (p00025); "Chinese walls" and the Opium War (p00029); combinations and trade unions (p00046); the Ten Hours Act (p00048). **Check the dates and facts.**
  - **1 new text note** (p00030), on "idiocy" of rural life, the double reading of Idiotismus. This is the only use of the "two readings" exception.
  - **Plain English:** all 28 passages with a sentence over 35 words were split. The longest sentence drops from 76 words to 35, with every clause and link word kept.
