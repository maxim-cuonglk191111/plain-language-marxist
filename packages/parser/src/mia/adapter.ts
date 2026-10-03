import { parseLayout } from "@plm/schema";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { decodeHtml } from "../decode.ts";
import type { NormalizedBlock, NormalizedDocument, RawSource, SourceAdapter } from "../types.ts";

// Rules: docs/architecture/mia-markup.md. Bump VERSION whenever output changes,
// so source.yml records which parser produced it.

type Node = DefaultTreeAdapterMap["childNode"];
type Element = DefaultTreeAdapterMap["element"];
type Parent = DefaultTreeAdapterMap["parentNode"];

const isElement = (n: Node): n is Element => "tagName" in n;
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;
const classes = (el: Element) =>
  (attr(el, "class") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
const hasClass = (el: Element, c: string) => classes(el).includes(c);

function textOf(node: Node | Parent): string {
  if ("value" in node && node.nodeName === "#text") return node.value;
  if (!("childNodes" in node)) return "";
  return node.childNodes.map(textOf).join("");
}

function* descendants(node: Parent): Generator<Element> {
  for (const child of node.childNodes) {
    if (isElement(child)) {
      yield child;
      yield* descendants(child);
    }
  }
}

/** Text that appears before `target` inside `root`, in document order. */
function textBefore(root: Parent, target: Element): string {
  let out = "";
  const visit = (node: Parent): boolean => {
    for (const child of node.childNodes) {
      if (child === target) return true;
      if (child.nodeName === "#text") out += (child as { value: string }).value;
      else if ("childNodes" in child && visit(child as Parent)) return true;
    }
    return false;
  };
  visit(root);
  return out;
}

const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const HEADING = /^h([1-6])$/;
const CHROME_CLASSES = ["title", "footer", "skip", "updat", "toc", "index"];
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "dl",
  "table",
  "div",
  "center",
  "pre",
]);
const QUOTE_CLASSES = ["quoteb", "quote"];
const INDENT_CLASSES = ["indentb"];
const NOTE_LABEL = (s: string) => s.replace(/[\s().[\]]/g, "");

/** Collapses HTML whitespace, then tidies spaces around line breaks and at the edges. */
function tidy(markup: string): string {
  return markup
    .replace(/[ \t\r\n\u00a0]+/g, " ")
    .replace(/ ?<br\/> ?/g, "<br/>")
    .replace(/^(?:<br\/>)+|(?:<br\/>)+$/g, "")
    .trim();
}

type Note = { label: string; editorial: boolean };

class MiaConverter {
  readonly warnings = new Set<string>();
  readonly metadata: Record<string, string> = {};
  readonly blocks: NormalizedBlock[] = [];
  readonly notes: NormalizedBlock[] = [];
  /** target name → note info, built from the references in the text. */
  private readonly targets = new Map<string, Note>();
  private inNotesArea = false;
  private currentNote: NormalizedBlock | null = null;
  private currentNoteEditorial = false;

  constructor(private readonly body: Element) {}

  run(): void {
    this.collectReferences();
    this.walk(this.body, false);
    const editorialRefs = [...this.targets.values()].filter((n) => n.editorial).length;
    if (editorialRefs)
      this.warnings.add(`dropped ${editorialRefs} editorial note(s) and their references`);
  }

  /** Footnote references: <sup class="enote|anote|ednote"><a href="#X">…</a></sup>. */
  private collectReferences() {
    for (const el of descendants(this.body)) {
      if (el.tagName !== "sup") continue;
      const link = [...descendants(el)].find(
        (d) => d.tagName === "a" && (attr(d, "href") ?? "").startsWith("#"),
      );
      const target = link && attr(link, "href")?.slice(1);
      if (!target || attr(link, "name") === target) continue;
      this.targets.set(target, {
        label: NOTE_LABEL(textOf(link)),
        editorial: hasClass(el, "ednote"),
      });
    }
    // Prefer the label printed on the note itself ("Note." beats a reference's "[note]").
    for (const el of descendants(this.body)) {
      const name = attr(el, "name") ?? attr(el, "id");
      const note = name === undefined ? undefined : this.targets.get(name);
      if (el.tagName === "a" && note && attr(el, "href") !== undefined) {
        const label = NOTE_LABEL(textOf(el));
        if (label) note.label = label;
      }
    }
  }

  private isChrome(el: Element): boolean {
    if (["hr", "img", "script", "style", "head", "title", "meta", "link"].includes(el.tagName)) {
      if (el.tagName === "img") this.warnings.add("dropped image(s)");
      return true;
    }
    return el.tagName === "p" && CHROME_CLASSES.some((c) => hasClass(el, c));
  }

  /** A note body starts with a back-linked anchor whose name a reference points to. */
  private noteStart(el: Element): { name: string; anchor: Element; editorial: boolean } | null {
    const nameOf = (d: Element) => attr(d, "name") ?? attr(d, "id");
    // A positional anchor may share a name with a note, so require a sign that this
    // is a note body: a back-link, a note-number wrapper, or MIA's notes class.
    const noteContext = (d: Element) => {
      const parent =
        d.parentNode && isElement(d.parentNode as Node) ? (d.parentNode as Element) : null;
      return (
        attr(d, "href") !== undefined ||
        hasClass(el, "information") ||
        (parent !== null && (parent.tagName === "sup" || hasClass(parent, "info")))
      );
    };
    const anchor = [...descendants(el)].find((d) => {
      const name = nameOf(d);
      return d.tagName === "a" && name !== undefined && this.targets.has(name) && noteContext(d);
    });
    if (!anchor) return null;
    if (textBefore(el, anchor).trim()) return null; // the anchor must open the block
    const name = nameOf(anchor) ?? "";
    let editorial = this.targets.get(name)?.editorial ?? false;
    for (let p = anchor.parentNode; p && p !== el; p = "parentNode" in p ? p.parentNode : null) {
      if (
        isElement(p as Node) &&
        (p as Element).tagName === "sup" &&
        hasClass(p as Element, "ednote")
      )
        editorial = true;
    }
    return { name, anchor, editorial };
  }

  /** <p class="information"><span class="info">Written:</span> …</p> */
  private metadataBlock(el: Element): boolean {
    if (!hasClass(el, "information")) return false;
    const label = [...descendants(el)].find((d) => d.tagName === "span" && hasClass(d, "info"));
    if (!label || [...descendants(label)].some((d) => d.tagName === "a" && attr(d, "name")))
      return false;
    const text = tidy(textOf(el));
    const m = /^([^:]{1,40}):\s*(.*)$/.exec(text);
    if (m?.[1]) this.metadata[m[1].trim()] = m[2] ?? "";
    return true;
  }

  private walk(parent: Parent, quote: boolean): void {
    let loose = "";
    const flushLoose = () => {
      const text = tidy(loose);
      loose = "";
      if (text && /[^\s]/.test(text.replace(/<[^>]+>/g, "")))
        this.emit({ type: quote ? "blockquote" : "paragraph", text });
    };
    for (const child of parent.childNodes) {
      if (!isElement(child)) {
        if (child.nodeName === "#text") loose += escapeText((child as { value: string }).value);
        continue;
      }
      const el = child;
      if (this.isChrome(el)) {
        flushLoose();
        continue;
      }
      const tag = el.tagName;
      const heading = HEADING.exec(tag);
      if (heading) {
        flushLoose();
        if (this.inNotesArea) continue; // "Editorial Notes", "Notes" headings
        const text = this.inline(el);
        if (!text) continue;
        if (/^[\s*·.]+$/.test(textOf(el)) && textOf(el).includes("*"))
          this.emit({ type: "separator", text });
        else this.emit({ type: "heading", level: Number(heading[1]), text });
        continue;
      }
      if (tag === "p" || tag === "dd" || tag === "dt") {
        flushLoose();
        this.paragraph(el, quote);
        continue;
      }
      if (tag === "li") {
        flushLoose();
        const text = this.inline(el);
        if (text) this.emit({ type: "list_item", text });
        continue;
      }
      if (tag === "table") {
        flushLoose();
        if (this.isLayoutTable(el)) {
          // Tables used for page layout: read their cells as ordinary content.
          this.warnings.add("unwrapped layout table(s) and read their cells as text");
          for (const cell of this.cellsOf(el)) this.walk(cell, quote);
        } else {
          this.table(el);
        }
        continue;
      }
      if (tag === "blockquote") {
        flushLoose();
        // A blockquote holding headings or rules is a page wrapper, not a quotation.
        const wrapper = [...descendants(el)].some(
          (d) => HEADING.test(d.tagName) || d.tagName === "hr" || d.tagName === "table",
        );
        this.walk(el, wrapper ? quote : true);
        continue;
      }
      if (
        ["div", "center", "ul", "ol", "dl", "body", "font", "section", "article", "main"].includes(
          tag,
        )
      ) {
        if (tag === "center") this.warnings.add("text alignment (center) is not preserved");
        flushLoose();
        this.walk(el, quote);
        continue;
      }
      loose += this.inlineNode(el);
    }
    flushLoose();
  }

  /** Mostly made of in-page links (href="#…") outside footnote markers: navigation, not text. */
  private isTableOfContents(el: Element): boolean {
    const total = textOf(el).replace(/\s+/g, "").length;
    if (total === 0) return false;
    let linked = 0;
    for (const a of descendants(el)) {
      if (a.tagName !== "a" || !(attr(a, "href") ?? "").startsWith("#")) continue;
      if (
        a.parentNode &&
        isElement(a.parentNode as Node) &&
        (a.parentNode as Element).tagName === "sup"
      )
        continue;
      linked += textOf(a).replace(/\s+/g, "").length;
    }
    return linked / total >= 0.6;
  }

  private paragraph(el: Element, quote: boolean): void {
    if (this.metadataBlock(el)) return;
    const start = this.noteStart(el);
    if (start) {
      this.inNotesArea = true;
      this.currentNoteEditorial = start.editorial;
      if (start.editorial) {
        this.currentNote = null;
        return;
      }
      const label =
        NOTE_LABEL(textOf(start.anchor)) || this.targets.get(start.name)?.label || start.name;
      const text = this.inline(el, true, start.anchor);
      this.currentNote = { type: "footnote", label, text };
      this.notes.push(this.currentNote);
      return;
    }
    if (this.inNotesArea && hasClass(el, "information")) {
      // Continuation paragraph of the current note.
      if (this.currentNoteEditorial || !this.currentNote) return;
      const text = this.inline(el);
      if (text) this.currentNote.text = `${this.currentNote.text}<br/><br/>${text}`;
      return;
    }
    if (this.isTableOfContents(el)) {
      this.warnings.add("dropped table-of-contents block(s)");
      return;
    }
    const style = (attr(el, "style") ?? "").toLowerCase();
    if (style.includes("text-align: center") || attr(el, "align") === "center") {
      this.warnings.add("text alignment (center) is not preserved");
    }
    const text = this.inline(el);
    if (!text) return;
    const type = quote || QUOTE_CLASSES.some((c) => hasClass(el, c)) ? "blockquote" : "paragraph";
    const indent =
      INDENT_CLASSES.some((c) => hasClass(el, c)) || /margin-left|text-indent/.test(style);
    this.emit({ type, text: indent ? `<indent level="1"/>${text}` : text });
  }

  /** Rows that belong to this table (not to a table nested inside it). */
  private rowsOf(table: Element): Element[] {
    const rows: Element[] = [];
    const visit = (node: Parent) => {
      for (const child of node.childNodes) {
        if (!isElement(child)) continue;
        if (child.tagName === "tr") rows.push(child);
        else if (child.tagName !== "table") visit(child);
      }
    };
    visit(table);
    return rows;
  }

  private cellsOf(table: Element): Element[] {
    return this.rowsOf(table).flatMap((tr) =>
      tr.childNodes.filter(isElement).filter((c) => c.tagName === "td" || c.tagName === "th"),
    );
  }

  /** A table whose cells hold block content (paragraphs, headings, other tables) is page layout, not data. */
  private isLayoutTable(table: Element): boolean {
    return this.cellsOf(table).some((cell) =>
      [...descendants(cell)].some((d) => BLOCK_TAGS.has(d.tagName)),
    );
  }

  private table(el: Element): void {
    const caption = el.childNodes.filter(isElement).find((c) => c.tagName === "caption");
    if (caption) {
      const text = this.inline(caption);
      if (text) this.emit({ type: "caption", text });
    }
    {
      const rows: string[] = [];
      for (const tr of this.rowsOf(el)) {
        const cells = tr.childNodes
          .filter(isElement)
          .filter((c) => c.tagName === "td" || c.tagName === "th");
        if (
          cells.every(
            (c) =>
              !textOf(c)
                .replace(/\u00a0/g, " ")
                .trim(),
          )
        )
          continue; // empty spacer row
        const html = cells
          .map((cell) => {
            let attrs = "";
            for (const key of ["colspan", "rowspan"]) {
              const n = Number(attr(cell, key));
              if (Number.isInteger(n) && n > 1 && n < 100) attrs += ` ${key}="${n}"`;
            }
            return `<${cell.tagName}${attrs}>${this.cell(cell)}</${cell.tagName}>`;
          })
          .join("");
        rows.push(`<tr>${html}</tr>`);
      }
      if (rows.length) this.emit({ type: "table", text: rows.join("") });
    }
  }

  /** Cell content: inline markup, with block children separated by line breaks. */
  private cell(cell: Element): string {
    const parts: string[] = [];
    let inline = "";
    for (const child of cell.childNodes) {
      if (isElement(child) && ["p", "div", "table"].includes(child.tagName)) {
        if (tidy(inline)) parts.push(tidy(inline));
        inline = "";
        if (child.tagName !== "table" && this.inline(child)) parts.push(this.inline(child));
      } else {
        inline += this.inlineNode(child);
      }
    }
    if (tidy(inline)) parts.push(tidy(inline));
    return parts.join("<br/>");
  }

  /** Converts an element's content to layout markup. */
  private inline(el: Element, tidyIt = true, skip?: Element): string {
    const out = el.childNodes.map((c) => this.inlineNode(c, skip)).join("");
    return tidyIt ? tidy(out) : out;
  }

  private inlineNode(node: Node, skip?: Element): string {
    if (!isElement(node))
      return node.nodeName === "#text" ? escapeText((node as { value: string }).value) : "";
    const el = node;
    if (el === skip) return "";
    if (skip && el.tagName === "sup" && [...descendants(el)].includes(skip)) return ""; // the note's own marker
    if (
      skip &&
      el.tagName === "span" &&
      hasClass(el, "info") &&
      [...descendants(el)].includes(skip)
    )
      return "";
    switch (el.tagName) {
      case "br":
        return "<br/>";
      case "i":
      case "em":
      case "cite":
      case "var":
        return this.wrap("i", el, skip);
      case "b":
      case "strong":
        return this.wrap("b", el, skip);
      case "sub":
        return this.wrap("sub", el, skip);
      case "sup": {
        const link = [...descendants(el)].find(
          (d) => d.tagName === "a" && (attr(d, "href") ?? "").startsWith("#"),
        );
        const target = link && attr(link, "href")?.slice(1);
        const note = target ? this.targets.get(target) : undefined;
        if (note) return note.editorial ? "" : `<fn ref="${note.label.replace(/"/g, "")}"/>`;
        return this.wrap("sup", el, skip);
      }
      case "img":
        this.warnings.add("dropped image(s)");
        return "";
      case "script":
      case "style":
        return "";
      default:
        // a, span, font, u, small, tt …: keep the text, drop the element.
        return el.childNodes.map((c) => this.inlineNode(c, skip)).join("");
    }
  }

  private wrap(tag: string, el: Element, skip?: Element): string {
    const inner = el.childNodes.map((c) => this.inlineNode(c, skip)).join("");
    if (!inner.replace(/<br\/>/g, "").trim()) return inner;
    // Keep surrounding spaces outside the tag so emphasis never starts or ends with a space.
    const lead = /^\s/.test(inner) ? " " : "";
    const trail = /\s$/.test(inner) ? " " : "";
    return `${lead}<${tag}>${inner.trim()}</${tag}>${trail}`;
  }

  private emit(block: NormalizedBlock): void {
    if (this.inNotesArea && block.type !== "footnote") {
      // Anything after the notes start is page furniture (credits, links), not text.
      return;
    }
    this.blocks.push(block);
  }
}

export const MiaAdapter: SourceAdapter = {
  name: "mia",
  version: "1.0.0",
  canHandle: (url) => url.hostname === "www.marxists.org" || url.hostname === "marxists.org",
  parse(raw: RawSource): NormalizedDocument {
    const document = parse(decodeHtml(raw.bytes));
    const html = document.childNodes.find(isElement);
    const head = html?.childNodes.filter(isElement).find((e) => e.tagName === "head");
    const body = html?.childNodes.filter(isElement).find((e) => e.tagName === "body");
    if (!body) throw new Error("no <body> in page");
    const titleEl = head && [...descendants(head)].find((e) => e.tagName === "title");
    const title = tidy(titleEl ? textOf(titleEl) : "") || "Untitled";

    const converter = new MiaConverter(body);
    converter.run();
    const blocks = [...converter.blocks, ...converter.notes];
    for (const block of blocks) {
      const result = parseLayout(block.text);
      if (!result.ok) {
        throw new Error(
          `MIA parser produced invalid layout markup (${result.error.message}): ${block.text.slice(0, 120)}`,
        );
      }
    }
    return {
      title,
      blocks,
      metadata: converter.metadata,
      warnings: [...converter.warnings].sort(),
    };
  },
};
