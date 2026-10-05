# Task 039 — Marx's major works first: free editions, order, and a Project Gutenberg source

| | |
|---|---|
| **Status** | Open (needs the maintainer: rights verification per work) |
| **Filed** | 2026-10-05 |
| **Owner** | Maintainer (rights), then contributors |
| **Severity** | High: the archive's next priority |
| **Milestone** | M3 (archive growth) |
| **Depends on** | 034 (term senses: Marx's own terms change between 1848 and 1867) |
| **Related** | 035 (council communism and De Leon: runs alongside), 033 (original-language layer) |

## Direction (maintainer, 2026-10-05)
Marx's important works come first, alongside task 035. This is the foundation that the council communists and De Leon build on and argue from.

## Problem: the free English editions are mostly not on MIA
MIA often serves a later translation that is still in copyright, usually Progress Publishers (Moscow, 1960s–70s) or Saul Padover. Old free translations exist for most works, and several are on **Project Gutenberg**, which is reachable from the maintainer's machine. MIA is not.

Checked 2026-10-05 from MIA's own source notes and Gutenberg's catalogue. **The maintainer verifies each work before import.**

| Work | MIA's English text | Free edition to use | Where |
|---|---|---|---|
| *Value, Price and Profit* (1865) | Marx's own English; first published 1898, edited by Eleanor Marx (MIA cites a 1969 reprint) | Same text, without the 1969 editorial notes | MIA |
| *The Civil War in France* (1871 Address) | Marx's own English | Same | MIA (already queued in task 035) |
| *Capital*, Vol. I (1867) | First English edition, 1887 (Moore & Aveling, edited by Engels), "4th German edition changes included" | 1887 edition. Check who translated the inserted 4th-edition passages; leave them out if not free | MIA |
| *The Eighteenth Brumaire* (1852) | Partly Saul Padover's modern translation: **not free** | **Daniel De Leon's 1897 translation** (it also links Marx and De Leon) | Gutenberg #1346 |
| *A Contribution to the Critique of Political Economy* (1859), esp. the Preface | — | N. I. Stone's translation, 1904 | Gutenberg #46423 |
| *Theses on Feuerbach* (1845) | Modern Progress translation: **not free** | Austin Lewis's translation in Engels's *Feuerbach*, 1903 (check it includes the Theses) | Gutenberg #27814 |
| *Critique of the Gotha Programme* (1875) | Progress Publishers, 1970: **not free** | The 1900 translation in the SLP's *The People* (De Leon's paper); a copy still has to be found (Wikisource, archive.org) | to find |
| *Wage Labour and Capital* (1849) | "The original 1891 pamphlet", English translator not named: **unclear** | Probably Harriet Lothrop, New York Labor News, 1902; to confirm | to find |
| Engels, *Socialism: Utopian and Scientific* (1880) | Progress Publishers, 1970: **not free** | Edward Aveling's translation, 1892 | to find |

## Suggested order
1. ***Value, Price and Profit***: short, written in English, and the clearest first statement of labour-power and surplus value. Full Plain English.
2. ***The Civil War in France***: the Paris Commune, the touchstone for council communism (task 035).
3. ***The Eighteenth Brumaire***, in De Leon's translation. Mostly Context: full of 1848–51 French politics.
4. ***Critique of the Gotha Programme***: the "lower and higher phase" of communism, central to the debates with Lenin. It needs its 1900 source first.
5. ***Capital*, Vol. I**, in selected chapters first: Ch. 1 (commodities), 4–7 (money into capital, labour-power, the labour process and surplus value), 10 (the working day), 25 (the general law of accumulation), and 26–33 (primitive accumulation). Full Plain English.
6. ***Theses on Feuerbach*** and the **1859 Preface**: short, often quoted, and hard. Plain English plus Context.

## Technical work
- **A Project Gutenberg source adapter**, following docs/architecture/parser-guide.md: parse-check, fixtures, golden files. Gutenberg's HTML is regular, and every book states its licence.
  - The adapter keeps the book's text and drops Gutenberg's header and licence boilerplate. The "Not kept" report must show only that.
  - `config/sources.yml` gains the provider, and `work.yml` credits Project Gutenberg and the translator.
- **Senses (task 034)** before *Capital*: in 1848 Marx writes "labour" where in 1867 he distinguishes labour from labour-power. Cards must not give one meaning for both.

## Acceptance
- Each imported work has rights verified by the maintainer, and its source is the free edition.
- A "Marx: where to start" reading path (task 032 C), with the rationale written out.
- `pnpm check` and `pnpm e2e` pass.
