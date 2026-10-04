# Task 029 — Manifesto Chapter III: Socialist and Communist Literature

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-04 |
| **Owner** | Claude |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 028 |

## Goal
Complete, 10/10 quality import and Plain English rendering of Chapter III of the Communist Manifesto ("Socialist and Communist Literature").

## Nature of Chapter III
Chapter III is historically and intellectually the most challenging chapter in the Manifesto. It is a polemical taxonomy of competing socialist tendencies in 1848:
1. **Reactionary Socialism:**
   - Feudal Socialism (aristocratic critics of capitalism);
   - Petty-Bourgeois Socialism (Sismondi's nostalgic defense of small artisans and peasants);
   - German, or "True", Socialism (Karl Grün's pedantic Hegelian translations of French socialist tracts).
2. **Conservative, or Bourgeois, Socialism:**
   - Proudhon's *Philosophy of Poverty*; philanthropists wanting capitalism without its necessary miseries.
3. **Critical-Utopian Socialism and Communism:**
   - Saint-Simon, Fourier, Robert Owen: brilliant early critiques of capitalism, but relying on utopian moral appeals rather than working-class class struggle.

## Scope

### 1. Source Import
- Run `pnpm plm import https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch03.htm --via wayback`.
- Add `ch03` to `work.yml`.

### 2. Term Cards & Factions Vocabulary
- Add vocabulary cards for socialist tendencies:
  - `feudal-socialism`;
  - `petty-bourgeois-socialism`;
  - `true-socialism`;
  - `bourgeois-socialism`;
  - `utopian-socialism`.
- Each card must define what the tendency was, who led it, and why Marx and Engels opposed it.

### 3. Plain English Drafting (`en-plain.yml`)
- Demystify the dense, satirical language:
  - Marx's parody of German philosophical jargon ("Alienation of Humanity", "True Society") must be translated into clear English that makes the satire evident to a modern reader.
  - Split long periodic sentences ($\le$ 35 words).

### 4. Rich Context Layer (`explanations.yml`)
- Chapter III requires more background notes than any other chapter:
  - Who Sismondi, Proudhon, Saint-Simon, Fourier, and Robert Owen were;
  - The historical context of the "Young England" movement and the French Legitimists;
  - Why the utopian socialists appealed to rulers rather than organizing workers.
- Sentences $\le$ 25 words.

## Acceptance Criteria
- [x] Ch. III imported and verified.
- [x] Faction term cards created and validated.
- [x] Satirical and theoretical passages rendered clearly without losing the sharpness of the critique.
- [x] Context layer clarifies all historical references.
- [x] `pnpm check` and `pnpm e2e` pass cleanly.
