# Task 040 — Marxism Fundamentals: Reading Primary Sources Leading to Das Kapital

| | |
|---|---|
| **Status** | In progress (initial collection staged with Manifesto & Value, Price and Profit) |
| **Filed** | 2026-10-06 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 (first curated reading path) / M3 (corpus expansion) |
| **Depends on** | 032 C (reading paths engine), 039 (Marx's major works first) |
| **Related** | 034 (term senses), 038 (visual companion) |

## Problem

Many readers approaching Marxism for the first time want to read *Das Kapital* (1867), yet opening Volume 1 directly presents a formidable barrier: Chapter 1 ("The Commodity") relies on dense dialectical exposition of the value-form that assumed readers were already grounded in classical political economy (Adam Smith, David Ricardo) and Hegelian dialectics.

Newcomers frequently turn to secondary textbooks, commentaries, or internet summaries, which often introduce ideological distortions, sectarian dogmatism, or anachronistic misinterpretations.

A structured **"Marxism Fundamentals" reading path** composed purely of **primary sources in plain language** provides an authentic, accessible pedagogical ramp. It guides the reader through foundational historical materialism and introductory political economy before tackling *Capital*.

## The Pedagogical Roadmap (5 Stages)

A comprehensive path through the primary literature leading up to *Capital*:

```
Stage 1: Core Political Theory & Historical Materialism (1847–1848)
  ├── Principles of Communism (Engels, 1847) [Q&A primer]
  └── The Communist Manifesto (Marx & Engels, 1848; Ch. I, II, IV)

Stage 2: Popular Economic Foundation (1849–1865)
  ├── Wage Labour and Capital (Marx, 1849/1891 edition)
  └── Value, Price and Profit (Marx, 1865; speech to trade unionists)

Stage 3: Philosophical & Methodological Foundations (1845, 1880)
  ├── Theses on Feuerbach (Marx, 1845)
  ├── The German Ideology (Marx & Engels, 1845; Part I: Feuerbach)
  └── Socialism: Utopian and Scientific (Engels, 1880)

Stage 4: The Bridge to Political Economy (1859)
  └── A Contribution to the Critique of Political Economy (Marx, 1859; Preface)

Stage 5: Das Kapital (Capital, Volume 1, 1867)
  └── Capital Volume 1: Commodity, Surplus Value, Capitalist Accumulation
```

### Stage 1: Core Political Theory & Historical Materialism
- **The Communist Manifesto (1848)**: Demonstrates the materialist conception of history in action through the class struggle between bourgeoisie and proletariat, analyzes the dynamics of the modern capitalist epoch, and outlines the communist program.
- **Principles of Communism (1847)**: Engels's draft catechism in 25 questions and answers, offering simple definitions of the industrial revolution, machinery, and class stratification.

### Stage 2: Popular Economic Foundations
- **Wage Labour and Capital (1849)**: Delivered as lectures to the German Workingmen's Club of Brussels. Introduces what wages are, how prices are determined, and what capital represents (accumulated labour).
- **Value, Price and Profit (1865)**: Delivered by Marx in English to the General Council of the First International. Rebuts the reformist argument that wage rises cause price rises, explains the source of surplus value (unpaid surplus labour), and demonstrates that the working class must struggle on both the economic and political fronts.

### Stage 3: Philosophical & Methodological Foundations
- **Theses on Feuerbach (1845)**: 11 concise theses establishing materialist praxis over contemplative philosophy.
- **The German Ideology (1845, Part I)**: The first coherent elaboration of historical materialism—that social consciousness is determined by material social existence and production.
- **Socialism: Utopian and Scientific (1880)**: Engels's popular synthesis tracing the transition from French utopian socialism and German dialectics to modern scientific socialism.

### Stage 4: The Bridge to Political Economy
- **Contribution to the Critique of Political Economy (1859, Preface)**: Marx's definitive autobiographical formulation of the relationship between economic base (relations of production) and legal/political superstructure.

### Stage 5: Das Kapital (1867)
- After acquiring the foundational concepts (commodity, use-value, exchange-value, labour-power, surplus-value, accumulation) through stages 1–4, reading *Capital Volume 1* becomes lucid rather than esoteric.

## Implementation in Plain Language Marxist

### 1. Curated Path Collection (`content/collections/marxism-fundamentals.yml`)

The reading path infrastructure is already implemented in `apps/web/src/app/paths/` and `apps/web/src/lib/paths.ts` (Task 032 C).

We instantiate the first production path using the works and chapters currently active in the Plain Language Marxist corpus:
1. `document:marx:1848:communist-manifesto:ch01` — Bourgeois and Proletarians (Historical materialism & class struggle)
2. `document:marx:1848:communist-manifesto:ch02` — Proletarians and Communists (Property, the family, the working-class program)
3. `document:marx:1848:communist-manifesto:ch04` — Position of Communists in Relation to Opposition Parties (Revolutionary strategy & alliances)
4. `work:marx:1865:value-price-profit` — Value, Price and Profit (The popular economic primer on value and surplus value)

As additional texts from Task 039 (*Wage Labour and Capital*, *Contribution to the Critique*) and Engels's foundational texts are imported into the archive, they will be added into this path.

### 2. Validation & Verification

- `pnpm plm validate` ensures all `items` reference active works or documents in `content/works/`.
- `pnpm plm build` verifies static manifest inclusion under `index.collections`.
- `pnpm --filter @plm/web build` generates `/paths/marxism-fundamentals/` with chapter-by-chapter reading times and browser-local completion checklists.
