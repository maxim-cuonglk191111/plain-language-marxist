# Task 022 — Term cards that really explain Marxist terms, in simple language

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 010, 015 |

## Problem
The term cards are too thin to explain Marxist terms. Most have one short sentence. Many terms that Ch. I depends on have no card at all: *mode of production*, *relations of production*, *productive forces*, *means of exchange*, *exchange value*, *mode of appropriation*. A reader meeting these words for the first time is left alone with them.

## Who we write for (maintainer, 2026-10-04)
- **Politically young readers** who are new to Marxism and its vocabulary.
- **People whose first language may not be English.**

So every card is written in **clear, simple language**: short sentences, common words, one idea per sentence. The **critical Marxist terms themselves are kept**. The card explains *mode of production*; it never swaps it for something looser.

## Scope

### 1. Writing standard (in `docs/editorial/STYLE.md`)
Add a "Term cards and explanations" section. It applies to term cards and explanations, never to the Plain English layer, which stays under the core rules: no added definitions or examples.
- **Sentences:** aim for 20 words or fewer, with common words (about CEFR B1 level). No idioms.
- **Use simpler words.** Never define a term with a harder word, or with another Marxist term the reader may not know. If another term is needed, name it so it can be linked to its own card.
- **Say what the word means in this text,** then how it differs from everyday English. For example, "bourgeois" is not just "middle class"; "capital" is not just money.
- **One concrete example,** taken from the text where possible ("steam and machinery revolutionised industrial production").
- **No hedging and no taking sides.** If readings really differ, say that in the long text and attribute each one.

### 2. Card shape
Today a card has `definition.short`, `long` and `sources`. Extend it so a card can answer the questions a newcomer has:
- **`short`:** one sentence, shown inline in the reader.
- **`long`:** two to five short paragraphs.
- **`example`** (new, optional): a sentence from the work showing the term in use, with its passage ID.
- **`not_to_confuse`** (new, optional): the everyday meaning the term should not be confused with.
- **`related`** (new, optional): slugs of related cards, shown as links. For example, *mode of production* → *relations of production*, *productive forces*.

This is a **persisted shape change**. Bump the vocabulary `schema_version`, ship the `plm migrate` step in the same commit, extend `DataTerm` in data contract v1 (adding optional fields only, so v1 stays compatible), and render the new fields on the term card and the vocabulary page.

### 3. New cards for Ch. I
Candidates. Confirm the final list when drafting.
- **The economic core:** mode of production, relations of production, productive forces, instruments of production, means of exchange / mode of exchange, exchange value, mode of appropriation, means of subsistence, division of labour, labour (labour power, in Engels's note), free competition, free trade.
- **Classes and history:** class struggle, feudalism / feudal society, petty bourgeoisie, the State, plus the history words patrician, plebeian, vassal, commune and third estate. Some of these may be better as explanations than cards.
- **Crises:** commercial crisis, over-production.

Then run `plm annotate` so the new terms are marked in the original. Check that plurals and variants match: *modes of production*, *means of production and of exchange*, *relations of property*.

### 4. Rewrite the 15 existing cards to the new standard
These are bourgeoisie, burgher, capital, class antagonism, commodity, guild-master, journeyman, lumpenproletariat, manufacture, means of production, Modern Industry, proletariat, serf, wage labour and world market.

### 5. Person forms
Add person forms to the term system: `person` for "the bourgeois", "a proletarian"; `person_pl` for "the bourgeois", "proletarians". The task 012 drafts had to work around their absence; see the notes there. This is another persisted shape change (term forms), so it follows the same rule. Once it exists, revisit the task 012 renderings that used workarounds.

### 6. Review
Get at least one reader from the target audience, ideally a non-native English speaker new to Marxism. Their questions go back into the cards.

## Acceptance
- Every Marxist term in Ch. I that a newcomer needs has a card, or a deliberate decision not to give it one, with the reason recorded here.
- Every card meets the STYLE standard and has been read by someone from the target audience.
- The new fields appear on the term card and the vocabulary page, and still work without JavaScript.
- `pnpm check` and `pnpm e2e` pass; the migration upgrades the existing vocabulary files.
