# Friction Log

- `plm` CLI command `locate()` fails when run against files in external git worktrees because it assumes target document paths are relative descendants of the current repo root.
- The inline gloss detector in `checkRenderings()` flags any term followed by an em-dash (`—`) as an inline definition unless restructured or punctuated with a colon.
- Vocabulary terms without a declared `sg` form (such as `reactionary` and `conservative`) cannot use bare `{term}` tokens and must explicitly specify their declared form (e.g. `{reactionary:adj}`).
- The sentence-splitting regex `(?<=[.!?])\s+` in `checkRenderings()` fails to split after sentences ending in quotes when punctuation sits inside the closing quote mark.
- Naming the terminology toggle button "Original" creates a Playwright strict-mode locator collision with the reader layer switch button of the same name, resolved by labeling it "Original (1848)".
- Running `pnpm e2e` builds Next.js using `e2e/fixture-repo` and writes to `apps/web/out`, overwriting any previous production static export with test fixture data until `pnpm build:site` is re-run.
- The `plm annotate` CLI command accepts only a single document path argument at a time and errors out if passed multiple paths in a single invocation.
- With tsconfig's `exactOptionalPropertyTypes` enabled, optional component and data properties passed as undefined require explicit `prop?: T | undefined` typing to avoid TS2375/TS2379 typecheck errors.
