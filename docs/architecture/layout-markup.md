# Layout Markup v1

The inline syntax used in passage `text` (`source.yml`) and in rendering `text`. It preserves the original layout (SDD §5.3) without carrying over any source-site HTML. Implemented in `packages/schema/src/layout/`.

## Design

- **A tiny closed tag set**, written as XML-like tags. Angle brackets almost never appear in historical prose, so the tags cannot clash with the text. They also cannot clash with term tokens, which use `{…}` (SDD §6.2).
- **Allowlist only.** Any other tag or attribute is a parse error, so raw HTML can never get in.
- **Hash-neutral.** The passage `hash` is computed over the plain text (see below), so changing layout alone never counts as a text change.

## Tags

| Markup | Meaning | Rules |
|---|---|---|
| `<i>…</i>` | Emphasis (italic in the source) | Nestable with `b`, `sc`, `a` |
| `<b>…</b>` | Strong (bold in the source) | Nestable |
| `<sc>…</sc>` | Small caps | Nestable |
| `<a href="URL">…</a>` | Link | `href` is `https://…` or a site path starting with `/`. Must not be nested inside another `a` |
| `<br/>` | Line break inside a block (verse, addresses, letter headings) | Self-closing |
| `<indent level="N"/>` | Indentation of the following line, N = 1–6 | Self-closing. Only at the start of the text or right after `<br/>` |
| `<fn ref="LABEL"/>` | Footnote reference | Self-closing. `LABEL` matches the `label` of a `footnote` passage in the same document |
| `<sup>…</sup>`, `<sub>…</sub>` | Superscript, subscript (formulas, ordinals) | Nestable |
| `<tr>…</tr>` | Table row | Only at the top level, and only in passages of type `table`. Contains only `td`/`th` |
| `<td>…</td>`, `<th>…</th>` | Table cell, header cell | Only directly inside `tr`. Optional `colspan="N"` and `rowspan="N"` (1–99). May contain inline markup and `<br/>` |

A `table` passage's text is nothing but rows, for example `<tr><th>Year</th></tr><tr><td>1864</td></tr>`. Whitespace between rows and cells is ignored. Layout-only tables nested inside other tables in the source (such as the value-form equations in *Capital*) are flattened to their innermost rows, and the parser reports a warning when it does this (docs/architecture/mia-markup.md).

Blocks themselves (paragraph, heading, list item, footnote…) are **not** expressed in markup. They are passages with a `type` (SDD §5.3). Rendering text separates its output paragraphs with blank lines, and each paragraph may use the same inline markup.

## Escaping

| Write | For |
|---|---|
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&amp;` | `&` |
| `&quot;` | `"` (needed only inside attribute values) |

A bare `&` that does not start one of these four entities is read as a literal `&`, so prose like `&c.` stays readable. The serializer always writes `&amp;`.

## Plain text (used for hashing and checks)

`toPlainText` does the following, in order:
1. Drop all tags, keeping the text inside `i`, `b`, `sc` and `a`.
2. Turn `br` into a space, put a space around every table row and cell, and drop `indent` and `fn`.
3. Decode entities.
4. Apply Unicode NFC.
5. Collapse runs of whitespace into a single space, and trim.

## Examples

```text
The history of all hitherto existing society<fn ref="1"/> is the history of class struggles.

<i>Proletarians of all countries, unite!</i>

Dear Sir,<br/><indent level="1"/>I have received your letter &amp; enclosure.
```
