# Task 030 — Manifesto Chapter IV: Tactical Alliances, Closing Slogan, and Complete Work Release

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 028, 029 |

## Goal
Complete Chapter IV of the Communist Manifesto ("Position of the Communists in Relation to the Various Existing Opposition Parties") and assemble the full, four-chapter work release.

## Nature of Chapter IV & The Closing Slogan
Chapter IV is short and tactical:
1. **Practical alliances across Europe in 1848:** France (Social-Democrats), Switzerland (Radicals), Poland (Cracow national insurrection), Germany (temporary tactical alliance with the bourgeoisie against absolute monarchy and feudal landlords, while preparing the workers for the subsequent socialist struggle).
2. **The Final Call to Action:** The famous closing paragraph culminating in the rallying cry of modern socialism.

### Slogan Rendering: Inclusive Plain Language
- **German Original:** *"Proletarier aller Länder, vereinigt euch!"* (Literally: "Proletarians of all countries, unite!").
- **Moore's 1888 English Translation:** *"WORKING MEN OF ALL COUNTRIES, UNITE!"*
- **Policy for Plain English:**
  - In Victorian English, "working men" was Moore's gendered rendering of German "Proletarier". However, as Marx and Engels emphasize throughout the Manifesto, large-scale modern industry pulled women and children into wage labour alongside men.
  - The Plain English layer renders the slogan using inclusive, neutral modern language: **"WORKERS OF ALL COUNTRIES, UNITE!"** (or **"WORKING PEOPLE OF ALL COUNTRIES, UNITE!"**).
  - `{proletariat:pl}` defaults to `workers` in our term system.
  - A `translation_note` explains Moore's 1888 wording against the German original.

## Scope

### 1. Source Import
- Run `pnpm plm import https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch04.htm --via wayback`.
- Add `ch04` to `work.yml`.

### 2. Plain English & Explanations
- Render Chapter IV passages with attention to 1848 revolutionary parties in France, Switzerland, Poland, and Germany.
- Historical context notes for Ledru-Rollin, the Swiss Sonderbund war, and the Cracow uprising of 1846.
- Translation note for the closing slogan.

### 3. Assembling the Complete Manifesto Release
- Update `content/works/marx/1848/communist-manifesto/work.yml` to list all 4 chapters: `[ch01, ch02, ch03, ch04]`.
- Verify reader navigation across chapters.
- Run complete validation: `pnpm check`, `pnpm e2e`.
- Cut the M1 final release artifact (`scripts/release.mjs`) containing the complete, four-chapter Manifesto.

## Acceptance Criteria
- [ ] Chapter IV imported, translated, and reviewed.
- [ ] Closing slogan rendered inclusively with accompanying translation note.
- [ ] All four chapters linked and navigable in reader.
- [ ] `pnpm check` and `pnpm e2e` pass with 100% clean results.
- [ ] Full release package built and validated.
