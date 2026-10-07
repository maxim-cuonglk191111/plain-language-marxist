# Friction Log

- `plm` CLI command `locate()` fails when run against files in external git worktrees because it assumes target document paths are relative descendants of the current repo root.
- The inline gloss detector in `checkRenderings()` flags any term followed by an em-dash (`—`) as an inline definition unless restructured or punctuated with a colon.
- Vocabulary terms without a declared `sg` form (such as `reactionary` and `conservative`) cannot use bare `{term}` tokens and must explicitly specify their declared form (e.g. `{reactionary:adj}`).
- The sentence-splitting regex `(?<=[.!?])\s+` in `checkRenderings()` fails to split after sentences ending in quotes when punctuation sits inside the closing quote mark.
- Naming the terminology toggle button "Original" creates a Playwright strict-mode locator collision with the reader layer switch button of the same name, resolved by labeling it "Original (1848)".
- Running `pnpm e2e` builds Next.js using `e2e/fixture-repo` and writes to `apps/web/out`, overwriting any previous production static export with test fixture data until `pnpm build:site` is re-run.
- The `plm annotate` CLI command accepts only a single document path argument at a time and errors out if passed multiple paths in a single invocation.
- With tsconfig's `exactOptionalPropertyTypes` enabled, optional component and data properties passed as undefined require explicit `prop?: T | undefined` typing to avoid TS2375/TS2379 typecheck errors.
- ESLint in this repo is configured without eslint-plugin-react-hooks, so inline comments disabling `react-hooks/exhaustive-deps` fail the linter with an undefined rule error.
- The capitalized name detector in `checkRenderings()` treats capitalized words following unpunctuated prefixes like `<indent level="1"/>(i) ` as proper names because they lack preceding sentence-boundary punctuation.
- Under high concurrency on Windows, Vitest tests executing multi-pass repository fixtures and validations (e.g. `packages/cli/src/commands/draft.test.ts`) can exceed the default 5000ms runner timeout, requiring `testTimeout: 15000` in `vitest.config.ts`.
- In `checkRenderings()`, words following closing quotation marks with space (e.g. `..." But `) are flagged as capitalized names because quotation marks are not matched by the sentence-boundary character class `[.!?:;]`.
- Collective noun vocabulary terms like `means-of-production`, `instruments-of-production`, and `productive-forces` only declare `sg` forms in their YAML schemas, causing `{term:pl}` tokens to fail schema validation even when referring to plural concepts.
- In quotation passages from historical sources, the `plm review` checker flags phrases like "at the disposal of" as hard words, requiring simplification or restatement even when rendering citations.
- Rapid batch execution of `plm import --via wayback` triggers intermittent archive.org connection resets (`ECONNREFUSED`), requiring progressive retry backoff and slight inter-request pacing.
- The chapter name extractor in `reading.ts` only matched Roman numerals and Arabic digits, causing English word headings like "Chapter One" in *Das Kapital* to fall back to the raw source title and an ordinal offset by preceding prefaces.
- On Marxists Internet Archive, the public-domain translation of the 1857 Introduction (*Grundrisse* Einleitung) is hosted under the 1859 *Contribution to the Critique of Political Economy* as Appendix I (`appx1.htm`), rather than under the 1857 *Grundrisse* directory which houses Martin Nicolaus's copyrighted translation.
- The distancing check in `checkRenderings()` matches `\bthey\s+(?:argue|claim|believe|suggest|contend)\b` without antecedent scoping, flagging legitimate third-person renderings of external authors criticized by the text unless rephrased with explicit names.
