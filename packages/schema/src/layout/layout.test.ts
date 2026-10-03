import { describe, expect, it } from "vitest";
import {
  collectNodes,
  parseLayout,
  serializeLayout,
  toPlainText,
  type LayoutNode,
} from "./index.ts";

function parse(text: string): LayoutNode[] {
  const result = parseLayout(text);
  if (!result.ok) throw new Error(`${result.error.message} at ${result.error.offset}`);
  return result.nodes;
}

function errorOf(text: string): string {
  const result = parseLayout(text);
  if (result.ok) throw new Error(`expected a parse error for: ${text}`);
  return result.error.message;
}

describe("parseLayout", () => {
  it("parses plain text as a single text node", () => {
    expect(parse("The history of all hitherto existing society")).toEqual([
      { type: "text", value: "The history of all hitherto existing society" },
    ]);
  });

  it("parses nested emphasis, links, footnotes, breaks and indentation", () => {
    expect(
      parse(
        'Dear Sir,<br/><indent level="1"/><i>See <a href="/archive/x.htm"><b>this</b></a></i><fn ref="1"/>',
      ),
    ).toEqual([
      { type: "text", value: "Dear Sir," },
      { type: "br" },
      { type: "indent", level: 1 },
      {
        type: "i",
        children: [
          { type: "text", value: "See " },
          {
            type: "a",
            href: "/archive/x.htm",
            children: [{ type: "b", children: [{ type: "text", value: "this" }] }],
          },
        ],
      },
      { type: "fn", ref: "1" },
    ]);
  });

  it("parses superscript, subscript and table rows with spanning cells", () => {
    expect(parse("M<sup>1</sup> and H<sub>2</sub>O")).toEqual([
      { type: "text", value: "M" },
      { type: "sup", children: [{ type: "text", value: "1" }] },
      { type: "text", value: " and H" },
      { type: "sub", children: [{ type: "text", value: "2" }] },
      { type: "text", value: "O" },
    ]);
    const table =
      '<tr>\n  <th colspan="2">Year</th>\n</tr><tr><td rowspan="2">£<br/>s.</td><td>4</td></tr>';
    expect(parse(table)).toEqual([
      {
        type: "tr",
        children: [{ type: "th", colspan: 2, children: [{ type: "text", value: "Year" }] }],
      },
      {
        type: "tr",
        children: [
          {
            type: "td",
            rowspan: 2,
            children: [{ type: "text", value: "£" }, { type: "br" }, { type: "text", value: "s." }],
          },
          { type: "td", children: [{ type: "text", value: "4" }] },
        ],
      },
    ]);
  });

  it("decodes the four entities and keeps a bare & literal", () => {
    expect(parse("&lt;a&gt; &amp; &quot;q&quot; &c.")).toEqual([
      { type: "text", value: '<a> & "q" &c.' },
    ]);
  });

  it.each([
    ["<p>x</p>", "tag <p> is not allowed"],
    ['<i class="x">x</i>', 'attribute "class" is not allowed'],
    ["<i>x", "unclosed <i>"],
    ["<i>x</b>", "unexpected closing tag </b>"],
    ["a < b", 'malformed tag or unescaped "<" (write &lt;)'],
    ["a > b", 'unescaped ">" (write &gt;)'],
    ["<br>", "<br> must be written <br/>"],
    ["<i/>", "<i> cannot be self-closing"],
    ['<a href="http://x.org">x</a>', 'href must be "https://…" or a site path starting with "/"'],
    ['<a href="/x"><a href="/y">y</a></a>', "<a> cannot be nested inside another <a>"],
    ["<a>x</a>", 'missing required attribute "href"'],
    ['<indent level="7"/>', "indent level must be 1–6"],
    ['text <indent level="1"/>', "<indent/> is only allowed at the start of a line"],
    ['<i><indent level="1"/></i>', "<indent/> is only allowed at the start of a line"],
    ['<fn ref=""/>', 'invalid footnote ref ""'],
    ["<td>x</td>", "<td> must be directly inside <tr>"],
    ["<tr>x<td>y</td></tr>", "text inside <tr> must be in a <td> or <th>"],
    ["<tr><i>x</i></tr>", "only <td> or <th> can appear inside <tr>, not <i>"],
    ["<i><tr><td>x</td></tr></i>", "<tr> is only allowed at the top level of a table"],
    ['<tr><td colspan="0">x</td></tr>', "colspan must be 1–99"],
    ['<tr><td align="center">x</td></tr>', 'attribute "align" is not allowed'],
  ])("rejects %s", (text, message) => {
    expect(errorOf(text)).toBe(message);
  });

  it("reports the offset of the offending tag", () => {
    const result = parseLayout("ok <p>");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.offset).toBe(3);
  });
});

describe("serializeLayout", () => {
  const samples = [
    'The history of all hitherto existing society<fn ref="1"/> is the history of class struggles.',
    "<i>Proletarians of all countries, unite!</i>",
    'Dear Sir,<br/><indent level="1"/>I have received your letter &amp; enclosure.',
    '<sc>Chapter</sc> I. <a href="https://www.marxists.org/a?b=1&amp;c=2">link</a> &lt;x&gt;',
    "&c. and bare & ampersands",
    'x<sup>2</sup><tr><th colspan="2">Year</th></tr><tr><td rowspan="3">a</td><td>b</td></tr>',
  ];

  it.each(samples)("round-trips parse → serialize → parse: %s", (text) => {
    const nodes = parse(text);
    expect(parse(serializeLayout(nodes))).toEqual(nodes);
  });

  it("always escapes & on output", () => {
    expect(serializeLayout(parse("&c."))).toBe("&amp;c.");
  });
});

describe("toPlainText", () => {
  it("drops layout, decodes entities, collapses whitespace", () => {
    const nodes = parse(
      '  Dear <i>Sir</i>,<br/><indent level="2"/>see<fn ref="1"/>   this &amp; that ',
    );
    expect(toPlainText(nodes)).toBe("Dear Sir, see this & that");
  });

  it("is unchanged by layout-only edits", () => {
    expect(toPlainText(parse("one two"))).toBe(toPlainText(parse("<i>one</i><br/>two")));
  });

  it("separates table cells with spaces", () => {
    expect(
      toPlainText(parse("<tr><td>1</td><td>coat</td></tr><tr><td>10</td><td>lbs</td></tr>")),
    ).toBe("1 coat 10 lbs");
  });

  it("normalizes to NFC", () => {
    expect(toPlainText(parse("Café"))).toBe("Café");
  });
});

describe("collectNodes", () => {
  it("finds nested nodes of one type", () => {
    const nodes = parse('<i>a<fn ref="1"/></i><fn ref="2"/>');
    expect(collectNodes(nodes, "fn").map((n) => n.ref)).toEqual(["1", "2"]);
  });
});
