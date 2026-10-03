# MIA Markup Survey

The findings from task 007, and the parsing rules that `MiaAdapter` (task 008) implements. Fixtures and their provenance are in `packages/parser/fixtures/mia/`.

## Sample

| Fixture | Why it was chosen |
|---|---|
| `manifesto-ch01.html` | The first work to import. Footnotes, inline editorial insertions, positional anchors |
| `capital-ch01.html` | UTF-8, deep heading levels, nested layout tables, `sub`/`sup`, many footnotes |
| `capital-ch25.html` | Statistics tables with `rowspan`/`colspan`, `£` in ISO-8859-1 |
| `soc-utop-ch03.html` | Quotation paragraphs, emphasis |
| `condition-industrial.html` | A page with no anchors at all |
| `civil-war-ch05.html` | Author notes mixed with editorial notes |
| `inaugural.html` | Image, `* * *` separators, a metadata block |
| `internationale.html` | Verse, uppercase legacy tags, `<center>` |

**Access.** www.marxists.org was not reachable from the development machine. The fixtures were fetched through the Wayback Machine in raw mode (`https://web.archive.org/web/{timestamp}id_/{url}`), which returns the original bytes with no archive toolbar. They are byte-identical to what MIA serves.

## Findings

### Encoding
- Pages declare their charset in `<meta http-equiv="Content-Type" content="text/html; charset=…">`.
- Most pages use `iso-8859-1`. `capital-ch01` uses `utf-8`.
- Decode `iso-8859-1` as **windows-1252**, the browser behaviour, because MIA pages contain cp1252 bytes such as curly quotes.
- Named and numeric entities (`&#8212;`, `&frac12;`, `&egrave;`) are common.

### Page structure
- There is no consistent content container. The Manifesto wraps everything in `<blockquote><div class="border">`, while Capital puts content directly in `<body>`. The parser must work by classification, not by locating one wrapper.
- **Chrome to drop:**
  - `p.title` (breadcrumb, "[German Original]" links);
  - `p.footer` (next/previous, table of contents);
  - `p.skip`, `p.updat`, `<hr>`, `<img>`;
  - empty or `&nbsp;`-only paragraphs.
- **Metadata blocks:** paragraphs of class `information` that open with `<span class="info">Label</span>:` ("Written by", "Source", "Translated", "Transcribed"). They are not text; drop them. They can feed the import report.

### Anchors
- `<a name="NNN"> </a>` marks positions, usually at the **end** of a paragraph (the start of the next one). Some pages have none (`condition-industrial`), and some use other names (`S3c1`, `000`, `en`).
- **Rule: discard all of them** (SDD §5.3, D5). The raw snapshot keeps them.

### Footnotes
- **A reference** in the text is `<sup class="enote|anote|ednote"><a href="#X">LABEL</a></sup>`. The label is written as `(2)`, `[1]` or `[A]`.
- **A note body** is a block element (usually `p.information`) that contains an element with `name="X"` (or `id="X"`) near its start, e.g. `<span class="info"><a name="a2" href="#ab2">2.</a></span>`. One note may continue over several following `p.information` paragraphs that have no anchor of their own.
- **Author notes vs editorial notes:**
  - `enote` and `anote` are the author's or translator's notes (in the Manifesto, Engels's 1888/1890 notes). They are kept.
  - `ednote` marks notes by later editors, and is often followed by a heading such as "Editorial Notes". These are not part of the work. Their references and bodies are dropped.
- **Inside note bodies,** MIA adds an attribution in `<span class="inote">[Engels, 1888 English Edition]</span>`. It is kept as part of the note text.

### Inline markup
- `<i>`/`<em>` become `<i>`, and `<b>`/`<strong>` become `<b>`.
- `<sup>`/`<sub>` are kept, except a `sup` that is a footnote reference, which becomes `<fn ref>`.
- **Links:** every `<a href>` in MIA text is added by MIA (glossary, other works). Unwrap them and keep the text.
- **Editorial insertions** in the text, such as `<span class="inote">[<i>lumpenproletariat</i>]</span>`, are short, bracketed and visibly editorial. Keep them as text. The brackets show readers they are insertions.
- Other `<span>` elements (`term`, `info` within text) are unwrapped.
- **Line breaks:** `<br>` becomes `<br/>`. Two in a row mark a stanza or section break inside one block, as in verse.

### Blocks

| MIA markup | Passage |
|---|---|
| `h1`–`h6` | `heading` with `level` 1–6 |
| `h*` whose text is only asterisks (`* * *`) | `separator` |
| `p` (no class, or `fst`, `text`) | `paragraph` |
| `p.indentb`, or `p` with a `margin-left` style | `paragraph`, text prefixed with `<indent level="1"/>` |
| `p.quoteb`, `p.quote`, `p` directly inside a non-wrapper `blockquote` | `blockquote` |
| `li` | `list_item` |
| `table` with inline cells | `table`. A `<caption>` becomes a `caption` passage just before it |
| `table` whose cells hold blocks (paragraphs, headings, tables) | Page layout, not data: the cells are read as ordinary content, with a warning |
| `p.pagenoted` / `p.pagenotec` (verse) | `paragraph` with `<br/>` lines |
| footnote body | `footnote` with `label`, appended after the main text in note order |

### Things the layout markup does not preserve (accepted)
- **Text alignment** (`text-align: center`, `<center>`). The parser warns about it but keeps no alignment.
- **Exact indentation amounts** (`margin-left: 20%`). Any indentation becomes level 1.
- **The bracket shape of the value-form equations in *Capital* Ch. 1.** The outer table is layout: the inner data table is kept as a table and the right-hand cell becomes its own paragraph. Revisit if readers find it confusing.
- **Tables of contents** (`p.toc`, `p.index`, or paragraphs that are mostly in-page links) are navigation and are dropped.

### Transcription quirks
MIA's text is the Original even where it differs from print. For example, *Manifesto* Ch. I has "Even manufacturer no longer sufficed" where Moore 1888 has "manufacture". Such cases are handled with a `translation_note` explanation (STYLE.md §10). The parser never corrects text.
