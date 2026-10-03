# Plain English Style Guide

How to write the Plain English layer. If you remember one line, make it this one:

> **Simplify the vocabulary, not the argument.**

The reader should come away knowing what the text *says*, in the authors' own voice and with the same force. They can then decide for themselves what it *means*, helped by explanations, which are a separate layer.

---

## 1. Who we write for

- **A general adult reader with no background in Marxism or 19th-century English.** As a target, aim for about US grade 8–10 reading level, roughly a quality newspaper. This is guidance, not a score to hit.
- **Many readers are not native English speakers.** Prefer common words and straightforward word order, even where an idiom would sound smoother to a native ear.
- **Readers can always check the original.** Plain English is a reading aid placed next to the source, never a replacement for it.

## 2. Core rules

The "Copy for LLM" prompt (`plm prompt`) embeds the block below word for word. Edit it only here.

<!-- core-rules:start -->
1. Modernize vocabulary and syntax. Do not modernize, soften or strengthen the argument.
2. Preserve every claim, example, list item, number, name, quotation and historical reference.
3. Preserve logical and causal relations, qualifications, negations and modality: not, never, only, except, unless, because, therefore, however, although, must, may, cannot.
4. Keep the authors' voice. Say what the text says, as the authors say it. Never report it ("Marx and Engels argue that…").
5. Keep strong claims exactly as strong. Do not hedge, soften or add disclaimers.
6. Do not add anything: no definitions, examples, context, commentary or framing sentences ("In other words…", "This was an important step…"). Those belong in explanations and term cards.
7. Do not remove difficult ideas. Make the sentence easier, not the idea.
8. Keep words that are still current English (capital, commodity, division of labour, world market, means of production). Readers get term cards for them.
9. Keep metaphors and images ("a spectre is haunting Europe"); simplify only the words around them.
10. Use term tokens for marked terms, e.g. {bourgeoisie}. Never put "a" or "an" directly before a token.
11. Keep footnote markers where they are and keep emphasis the source uses. Never merge, split or reorder passages.
12. Aim for about the original's length (0.8–1.5×). Much longer means you are explaining; much shorter means you are dropping something.
<!-- core-rules:end -->

## 3. What to change

| Kind | Original | Plain English |
|---|---|---|
| Archaic words | hitherto, thereby, whence, sway, wants (= needs), epoch, manifold | up to now, in this way, from where, rule, needs, era, many kinds of |
| Inverted word order | "From the serfs of the Middle Ages sprang the chartered burghers" | Usually fine to keep when it reads clearly. Change it only if it trips readers up |
| Long periodic sentences | One sentence with four clauses joined by semicolons | Several sentences, same order, same connectors |
| Stacked abstractions | "the revolutionary re-constitution of society at large" | "a revolutionary rebuilding of society as a whole" |
| Victorian spelling | mediaeval, world-market | medieval, world market (spelling only, never wording) |

**Don't change what is already clear.** Some sentences in the Manifesto are simple, and their Plain English may be almost identical. That is correct. Change for clarity, never for its own sake.

## 4. What must stay

- **Claims and their force.** "The executive of the modern state is but a committee…" remains a flat assertion. It doesn't become "tends to serve" or "ultimately serves".
- **Every list item.** "Freeman and slave, patrician and plebeian, lord and serf, guild-master and journeyman": all four pairs stay, in order.
- **Historical terms that have no modern equivalent.** Patrician, plebeian, guild-master, journeyman, serf: keep them, and let the term card explain. Don't substitute an approximation. "Serf" is not "peasant", and "burgher" is not "contract worker".
- **The meaning a word had in its time.** Marx's *manufacture* is workshop production by hand, before machinery. It must never become "the assembly line", which is a 20th-century invention.
- **Direction of causes.** "This development has, in its time, reacted on the extension of industry" means the world market pushed industry to grow. Writing "depended on industry expanding" reverses the direction.
- **Quotations, numbers, proper names and dates.** Copy them exactly.

## 5. Voice, glosses and framing

These three habits make a rendering longer and turn it into commentary. Each has a proper home elsewhere.

| Habit | Example | Where it belongs |
|---|---|---|
| Reporting the text | "Marx and Engels argue that the state serves…" | Nowhere. Write it in the authors' voice |
| Defining a term inline | "burghers—town residents who gained legal rights…" | The term card (`content/vocabulary/`) |
| Adding framing or commentary | "In other words, capitalism was changing the society around it." | An explanation (`explanations.yml`) |
| Softening or disclaiming | "Note: this is not a claim that every official works for business owners." | An explanation of kind `interpretation`, if needed at all |

## 6. Term tokens

- **Mark with a token** a term whose modern wording is a choice the project makes (bourgeoisie, proletariat, class antagonism). Write `{bourgeoisie}`, `{bourgeoisie:adj}` or `{Bourgeoisie}` at the start of a sentence. The reader sees the project's default wording, or the wording they chose for themselves (SDD §6).
- **Write plain words** when:
  - the term is still current English;
  - a specific context needs specific wording;
  - no declared form fits the grammar. For example, "the modern bourgeois", meaning a person, has no matching form in the bourgeoisie term, so keep the plain words.
- **Watch articles.** "a {bourgeoisie:adj} society" becomes "a capitalist society" by default, which is fine. But another wording might start with a vowel. Rephrase so that no article sits directly before a token ("societies of the {bourgeoisie:adj} kind", or restructure the sentence).
- **Pin** a single occurrence (`{bourgeoisie=bourgeoisie}`) only when this passage needs one specific rendering whatever the reader prefers. Explain why in your PR or contribution.

## 7. Paragraphs and coverage

- **One rendering normally covers one source paragraph.** A long Victorian paragraph may become several short output paragraphs inside the same rendering. Separate them with a blank line.
- **Covering several short source paragraphs with one rendering** is allowed when they are one thought that reads badly when split. This should be rare.
- **Never move content between renderings, and never reorder.** Everything in a rendering comes from the passages it covers.

## 8. Footnotes, emphasis and quotations

- Keep `<fn ref="…"/>` at the point in the sentence where the original has it.
- Keep `<i>…</i>` where the original emphasizes. Don't add new emphasis.
- Keep quotations verbatim, including quoted historical slogans. Simplify only the sentence around them.

## 9. The original is itself a translation

The Original layer of the *Manifesto* is Samuel Moore's 1888 English translation, which Engels edited and annotated. It is not the 1848 German. So PLM modernizes an authorized translation.

- Render the English as written. Don't "correct" it towards the German in Plain English.
- Where Moore's English is known to differ from the German, or Engels added something in 1888 (for example the note "That is, all written history"), write an explanation of kind `translation_note`.

## 10. AI assistance

You may draft with any LLM using `plm prompt` / "Copy for LLM". The rules are:
- **Declare it.** Set `ai_assisted: true`, or answer "yes" in the app.
- **You are responsible for every word.** Check each passage against the original and fix every warning the checks report.
- AI drafts tend to over-explain (see counter-example A). Cut them back to these rules.

## 11. Copyright

Never use a copyrighted modern version of a text as input, as an example in prompts, or as a fixture. That includes commercial "plain English" editions. They are quoted below only briefly, for critique.

---

## 12. Worked examples

All originals are from Moore's 1888 translation (public domain).

### Example 1: a simple sentence stays almost unchanged

> **Original:** The history of all hitherto existing society<fn ref="1"/> is the history of class struggles.
>
> **Plain English:** The history of all society up to now<fn ref="1"/> is the history of class struggles.

Only "hitherto existing" changes. The claim, its force and the footnote stay.

### Example 2: a long sentence is split, and every element stays

> **Original:** Freeman and slave, patrician and plebeian, lord and serf, guild-master and journeyman, in a word, oppressor and oppressed, stood in constant opposition to one another, carried on an uninterrupted, now hidden, now open fight, a fight that each time ended, either in a revolutionary re-constitution of society at large, or in the common ruin of the contending classes.
>
> **Plain English:** Freeman and slave, patrician and plebeian, lord and serf, guild-master and journeyman — in a word, oppressor and oppressed — stood in constant opposition to one another. They carried on an uninterrupted fight, sometimes hidden, sometimes open. Each time, that fight ended either in a revolutionary rebuilding of society as a whole, or in the common ruin of the classes in conflict.

The four pairs and both outcomes remain. "Common ruin" stays, because "everyone losing" would lose the meaning.

### Example 3: the guild system, with no lost claim

> **Original:** The feudal system of industry, under which industrial production was monopolised by closed guilds, now no longer sufficed for the growing wants of the new markets. The manufacturing system took its place. The guild-masters were pushed on one side by the manufacturing middle class; division of labour between the different corporate guilds vanished in the face of division of labour in each single workshop.
>
> **Plain English:** The feudal system of industry, in which closed guilds controlled all industrial production, could no longer meet the growing needs of the new markets. The manufacturing system took its place. The manufacturing middle class pushed the guild-masters aside. The division of labour between different guilds disappeared in the face of the division of labour inside each individual workshop.

"Division of labour" stays, because it is current English.

### Example 4: a strong claim stays strong

> **Original:** The executive of the modern State is but a committee for managing the common affairs of the whole bourgeoisie.
>
> **Plain English:** The executive of the modern state is nothing more than a committee for managing the common affairs of the whole {bourgeoisie}.

There is no "Marx and Engels argue", no "ultimately serves", and no disclaimer. If readers need context on what "executive" meant in 1848, that goes in an explanation.

### Counter-example A: over-explaining (an earlier AI draft)

> **Original:** From the serfs of the Middle Ages sprang the chartered burghers of the earliest towns. From these burgesses the first elements of the bourgeoisie were developed.
>
> **Draft (rejected):** The modern capitalist class did not appear out of nowhere. It developed gradually from the towns of medieval Europe. Some people who had originally been serfs eventually became burghers—town residents who gained special legal rights and became involved in trade and crafts. Over time, some of these urban groups developed into what Marx and Engels call the bourgeoisie.

What went wrong:
- It is about 3× the original's length.
- It adds a framing sentence ("did not appear out of nowhere").
- It defines "burghers" inline, which is the term card's job.
- It reports the text instead of speaking in its voice ("what Marx and Engels call").

> **Plain English:** From the serfs of the Middle Ages came the chartered burghers of the earliest towns. From these burghers, the first elements of the {bourgeoisie} developed.

The same draft also turned "is but a committee" into "ultimately serves", followed by a disclaimer note. It also dropped the guild-masters sentence from Example 3. Both break the core rules.

### Counter-example B: wrong substitutions (a 2012 commercial edition)

| Original | That edition | Problem |
|---|---|---|
| chartered burghers | contract workers | Wrong meaning |
| serfs | peasants | Loses the legal status of serfdom |
| Even manufacture no longer sufficed | Even the assembly line… | Anachronism |
| reacted on the extension of industry | depended on industry expanding | Reverses the causality |
| the common ruin of the contending classes | everyone losing | Loses the meaning |

---

## 13. Review checklist

For each passage, compare the rendering with the original and ask:
- Did the subject, the object or the direction of a cause change?
- Did a negation, a qualification or a modal ("must", "may", "only") disappear?
- Is every list item, number, name and quotation still there?
- Is the claim exactly as strong as in the original?
- Is there anything here that the original does not say?
- Is it roughly the original's length?
