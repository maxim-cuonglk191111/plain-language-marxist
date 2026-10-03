# Parser Guide: handling a new kind of source page

MIA has been hand-edited by many people over about 25 years, so each section of it (Marx/Engels, *Capital*, Lenin's Collected Works, letters, song lyrics) marks things up differently. Expect every new area to bring a new pattern. This guide covers how to find such patterns **before** they corrupt content, and how to fix the parser without breaking what already works.

## The one rule

**The parser may drop page furniture, but it must never drop or garble the text of a work silently.**

Three independent safeguards enforce this. Never weaken one to make a test pass.

| Safeguard | What it catches | Where |
|---|---|---|
| **Parse checks** (`inspectDocument`) | Error pages, no body text, empty passages, footnote references with no note, leftover HTML, navigation or credits in the text, merged paragraphs | `packages/parser/src/inspect.ts`. Errors stop `plm import` unless `--force` |
| **Missing-text check** (`missingText`) | Every run of source words that did not make it into the output. It compares the raw page with the output and **never looks at the parser's rules**, so it catches losses no rule anticipated | `packages/parser/src/coverage.ts`, printed by `plm parse-check` and `plm import` |
| **Golden files** | Any change in output (`*.golden.json`) **or in what is dropped** (`*.dropped.txt`) | `packages/parser/fixtures/mia/`. Every diff must be reviewed |

> **Why the dropped-text goldens exist.** At first only the output was golden. Those goldens were created from the parser's own output, so text the parser lost at the start was recorded as "correct": two tables in *Capital* ch. 25, figures in a note in *Socialism: Utopian and Scientific*, and two plain-numbered notes. Only an independent comparison with the raw page exposed them. A golden can only tell you that output **changed**; `missingText` tells you whether it is **complete**.

## Workflow for a new page or a reported problem

1. **Check without writing anything:**
   ```bash
   pnpm plm parse-check <url> --via wayback --show 40
   ```
   - Any `ERROR` means the page must not be imported as it is.
   - **Read every line under "Not kept".** Each must be navigation, credits or editors' notes. If a run is text of the work, that is a bug, even if no check failed.
   - Read the first blocks: are the types (heading, paragraph, blockquote, footnote) right, and is the layout (line breaks, indentation, emphasis) right?
2. **If something is wrong, keep the page as a fixture before changing code:**
   ```bash
   pnpm plm parse-check <url> --via wayback --save-fixture lenin-witbd-ch1
   ```
   Fill in the `TODO`s it adds to `provenance.json`. **Only public-domain or openly licensed texts may be committed.** For copyrighted texts, debug from a local file (`--file`) and do not commit it.
3. **Fix the adapter** (`packages/parser/src/mia/adapter.ts`):
   - Prefer a **structural** rule (what the markup means) over a page-specific one.
   - Never drop content without counting it in `warnings`.
   - Record the rule in `docs/architecture/mia-markup.md`.
4. **Regenerate and review every diff:**
   ```bash
   UPDATE_GOLDEN=1 pnpm test
   git diff packages/parser/fixtures
   ```
   For each changed golden, say why the change is right. Watch `.dropped.txt` especially: text appearing there is newly lost.
5. **Bump `MiaAdapter.version`** whenever output changes.
6. **Re-import affected documents** (`plm import`). Passage IDs survive by text hash. Renderings of passages whose text changed become stale and go to review.

## Known patterns (and where they are handled)

| Pattern | Seen in | Handling |
|---|---|---|
| ISO-8859-1 with cp1252 punctuation | most pages | Decoded by hand (`decode.ts`), because Node's TextDecoder treats windows-1252 as Latin-1 |
| Positional anchors `<a name="015">` | everywhere | Discarded |
| Breadcrumb, footer and "Next:" links (`p.title`, `p.footer`, `p.next`, `p.toc`, `p.index`, single-link paragraphs, link-only tables) | everywhere | Dropped as chrome |
| Metadata blocks (`p.information` + `span.info` "Written:") | most pages | Dropped; shown as metadata in the report |
| Footnote reference `<sup class="enote"><a href="#n1">` | Marx/Engels, *Capital* | `<fn ref>` |
| Reference with the link **around** the sup: `<a href="#2"><sup>[2]</sup></a>` | *Condition of the Working Class* | `<fn ref>` |
| Note body opened by a back-linked anchor in `p.information` or `p.endnote` | most pages | `footnote`. A reference counts only if its target **opens a block**; back-links into running text are not references |
| Notes numbered in plain text ("2. Compare…") after a "Notes" heading | older pages | `footnote` with that label; pending references are resolved after the walk |
| Note continued over several paragraphs (`information`, `endnote`, indented or quoted verse) | *Capital*, Lenin | Joined with `<br/><br/>` |
| Note whose body is a table, inside the `<p>` (quirks mode) or right after it | *Capital* ch. 15, 25 | The table becomes a `table` passage after the note; a body-less note reads `[table]` |
| Editorial notes: `sup.ednote`, Lenin CW ids `fw…E123`, notes signed "—Ed." | *Civil War*, Lenin, *Capital* | Dropped with their references (they are later editors', not the author's) |
| Lenin CW notes beside the text (`span.footnote-as-sidebar`) | Lenin | `footnote`, without ending the body |
| "This footnote has been moved into the body of the document." | Lenin | Dropped (MIA boilerplate) |
| Layout tables (cells containing blocks) | Internationale, *Capital* ch. 1 | Unwrapped; the cells are read as content |
| Data tables with `rowspan`/`colspan`, `<caption>` | *Capital* ch. 25 | `table` + `caption` passages |
| `<pre>` verse | some older pages | Lines become `<br/>`, leading spaces become `<indent>` |
| `* * *` headings | Inaugural Address | `separator` |
| MIA's "Object not found!" page, Wayback's own pages | missing URLs | Parse-check error `error-page` |
| Multi-version pages (several languages on one page) | Internationale | Text after the first notes is dropped **and reported**. Such pages need manual handling, not an import |

## Getting pages when marxists.org is blocked

`config/sources.yml` sets how pages are fetched. On networks where the site is blocked (Vietnam, China), use one of these:

- **`--via wayback`**: the Internet Archive's raw snapshot, byte-identical to what MIA served when it was archived. It can be days or months old; `source.via` records which snapshot was used.
- **A proxy (VPN)**: set `PLM_PROXY=http://127.0.0.1:7890` (for example the local port of Clash or v2rayN) and fetch `--via direct`. DNS is resolved at the proxy, so a locally blocked name still works. Use only a proxy you control; never a public one.

To compare the live site with what was imported from Wayback, run `pnpm plm diff-source --via direct` with `PLM_PROXY` set. A `FORMATTING_CHANGED` or `TEXT_CHANGED` result shows exactly how they differ.
