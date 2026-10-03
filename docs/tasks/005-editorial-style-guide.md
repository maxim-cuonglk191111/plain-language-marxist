# Task 005 — Editorial style guide for the plain register

| | |
|---|---|
| **Status** | In progress |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M0 |
| **Depends on** | — |

## Goal
Define concretely what "Plain English" means. The SDD gives the rules (§8.6) but not the target register, and both contributors and the "Copy for LLM" prompt need one.

## Scope
`docs/editorial/STYLE.md` covers:

- **Target reader and reading level.** Propose a measurable target, e.g. a general adult reader at about US grade 8–10. Treat it as guidance, not a hard metric.
- **Sentence length, vocabulary and syntax.** Which archaic forms change ("hitherto", inverted clauses, long periodic sentences) and what must stay.
- **Preserve / never lists** from SDD §8.6, with worked before/after examples taken from *Manifesto* Ch. I.
- **Term tokens.** When to use a token and when to write plain words, and how to choose forms. Never put "a" or "an" directly before a token (SDD §18).
- **Special content.** How to handle quotations, footnotes, numbers and proper names.
- **Translation of a translation.** The Original layer is Samuel Moore's 1888 English translation, not the German text. PLM modernizes a translation, so German terms belong in explanations, never in Plain English.
- **Paragraph coverage** (D4). When to split a long paragraph into several output paragraphs, and when to merge short ones into one.

- **Voice, glosses, framing and still-current terms** (SDD §8.6). Two failure modes are seen in practice, and the guide needs worked counter-examples of both:
  - **Over-explaining.** An earlier AI draft of Ch. I paragraphs 6–15 ran at 3–5× the original length. It reported the text ("Marx and Engels argue…"), defined terms inline, added framing and commentary sentences, softened the "committee" claim, and dropped one claim (the guild-masters being pushed aside). The fix: move the commentary into explanations and the definitions onto term cards, then restore the authors' voice.
  - **Wrong or anachronistic substitution.** A 2012 commercial "plain English" edition renders "chartered burghers" as "contract workers", "manufacture" as "assembly line", and "reacted on the extension of industry" as "depended on industry expanding", which reverses the causality.
- **Copyright.** Never use a copyrighted modern version (e.g. the 2012 BookCaps edition) as input, as an example in prompts, or as a fixture. Quote its errors in the guide only briefly, for critique.

Also write `docs/editorial/llm-prompt.md`: the prompt template that `plm prompt` (task 011) embeds.

## Acceptance
- Someone unfamiliar with the project can apply the guide to a new paragraph. Check this with one volunteer, or by re-reading it yourself after a break.
- The prompt template quotes the guide's rules word for word.

## Progress
- Drafted `docs/editorial/STYLE.md` (target reader, 12 core rules, change/keep tables, voice and gloss rules, term tokens, coverage, translation note, AI and copyright rules, 4 worked examples, 2 counter-examples, review checklist) and `docs/editorial/llm-prompt.md`.
- Every original quoted in the examples was checked against Moore's 1888 text.
- The prompt embeds the core rules by extracting the `core-rules` block from STYLE.md, so the two cannot drift apart.
- **Remaining for acceptance:** the maintainer reviews the draft, and one person unfamiliar with the project tries the guide on a new paragraph.
