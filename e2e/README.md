# End-to-end tests

Playwright tests against the **built static site** (task 019), including axe accessibility checks (task 016).

```bash
pnpm e2e        # builds the fixture site, serves it on 127.0.0.1:4174, runs the tests
```

- `fixture-repo/`: a frozen content repository holding the real *Manifesto* Ch. I source and vocabulary, the Ch. II–IV sources (no renderings, for chapter navigation), plus a few sample renderings (with term tokens) and an explanation, so the tests do not depend on how far task 012 has got. Validate it with `pnpm plm validate e2e/fixture-repo`.
- `build.mjs`: runs `plm build` on the fixture, then the Next.js export with `PLM_DATA_DIR` pointing at the result.
- `serve.mjs`: a dependency-free static server for `apps/web/out` that serves `.htm` as HTML, like a real static host.
