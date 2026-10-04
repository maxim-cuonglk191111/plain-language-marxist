# Task 028 — Manifesto Chapter II: Import, vocabulary, Plain English rendering and explanations

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-04 |
| **Owner** | Claude |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 027 |

## Goal
Complete, 10/10 quality import and Plain English rendering of Chapter II of the Communist Manifesto ("Proletarians and Communists").

## Nature of Chapter II
Chapter II contains two distinct rhetorical styles:
1. **Direct polemical debate with the bourgeoisie:** Marx and Engels address the reader/bourgeoisie directly in the second person (*"You are horrified at our intending to do away with private property..."*).
2. **The 10 transitional policy demands:** A concrete program of 10 measures to revolutionize the mode of production once the working class wins political power.

## Scope

### 1. Source Import & Structure
- Run `pnpm plm import https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch02.htm --via wayback`.
- Verify block layout against MIA; document any transcription errors for `translation_note` entries.
- Add `ch02` to `content/works/marx/1848/communist-manifesto/work.yml` documents list.

### 2. Term Cards & Vocabulary
- Add new vocabulary cards needed for Ch. II concepts:
  - `private-property` (crucial: distinguish private ownership of means of production from personal belongings/consumer goods, which newcomers consistently confuse);
  - `free-education` (historical context of 19th-century child labour).
- Annotate Ch. II passages with `pnpm plm annotate`.

### 3. Plain English Drafting (`en-plain.yml`)
- Follow STYLE.md core rules and the B1–B2 readability target:
  - **Preserve the direct 2nd-person address ("You"):** Keep the punchy, dramatic accusation of the authors; never soften into indirect reporting.
  - **The 10 Measures:** Render them in crisp, modern English without introducing 21st-century fintech/crypto anachronisms.
  - Keep sentence lengths under 35 words (average 15–20 words).
  - Run `pnpm plm review` to check against `hard-words.yml`.

### 4. Context & Explanations (`explanations.yml`)
- Provide selective passage background notes (`kind: historical_context`):
  - 19th-century property qualification for voting;
  - Status of women under bourgeois family laws in the 1840s;
  - Child labour in factories.
- Record any transcription corrections from MIA as `kind: translation_note`.
- Keep explanation sentences $\le$ 25 words.

## Acceptance Criteria
- [x] Ch. II imported and verified against MIA snapshot.
- [x] New term cards pass `pnpm plm validate` with pronunciation guides and "not_to_confuse" lines.
- [x] All passages rendered; 0 sentences over 35 words; all hard words resolved.
- [x] `pnpm plm validate` passes with 0 errors.
- [x] `pnpm check` and `pnpm e2e` pass cleanly.
