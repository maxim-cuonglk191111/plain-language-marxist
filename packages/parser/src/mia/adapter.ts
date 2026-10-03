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

/**
 * Old MIA pages are parsed in quirks mode, where a <table> may sit inside a <p>
 * (e.g. a table inside a footnote in Capital ch. 15). Split such paragraphs so
 * the table becomes a sibling: <p>before</p><table/><p>after</p>. The trailing
 * part keeps the paragraph's attributes, so a note's continuation stays a note.
 */
function liftTables(node: Parent): void {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (!child || !isElement(child)) continue;
    if (child.tagName === "p") {
      const at = child.childNodes.findIndex((c) => isElement(c) && c.tagName === "table");
      const table = child.childNodes[at];
      if (table) {
        const rest = child.childNodes.slice(at + 1);
        child.childNodes = child.childNodes.slice(0, at);
        const tail: Element = {
          ...child,
          attrs: child.attrs.filter((a) => a.name !== "id"),
          childNodes: rest,
        };
        for (const n of rest) n.parentNode = tail;
        table.parentNode = node;
        tail.parentNode = node;
        node.childNodes.splice(i + 1, 0, table, tail);
      }
    }
    liftTables(child);
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
const CHROME_CLASSES = [
  "title",
  "footer",
  "skip",
  "updat",
  "toc",
  "index",
  "next",
  "prev",
  "previous",
  "nav",
];
/** A paragraph that is nothing but one link like "Next: Section II" is navigation. */
const NAV_LINK = /^(next|previous|prev|back|return|contents|index|table of contents|top)\b/i;
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
/** Block containers whose content is read as ordinary flow. */
const CONTAINER_TAGS = new Set([
  "div",
  "center",
  "ul",
  "ol",
  "dl",
  "body",
  "font",
  "section",
  "article",
  "main",
  "header",
  "aside",
  "address",
  "figure",
  "span",
]);
/** Never text: dropped with a warning. */
const DROPPED_ELEMENTS = new Set([
  "nav",
  "footer",
  "form",
  "iframe",
  "object",
  "embed",
  "noscript",
  "button",
  "select",
  "input",
  "textarea",
  "svg",
  "map",
  "area",
  "audio",
  "video",
  "canvas",
]);
/** Inline elements whose text is kept and whose markup is dropped without a warning. */
const KNOWN_INLINE = new Set([
  "a",
  "span",
  "font",
  "u",
  "small",
  "big",
  "tt",
  "abbr",
  "acronym",
  "q",
  "s",
  "strike",
  "del",
  "ins",
  "code",
  "kbd",
  "samp",
  "dfn",
  "mark",
  "time",
  "wbr",
  "nobr",
  "label",
  "bdo",
  "bdi",
  "data",
  "center",
  "p",
  "div",
  "li",
  "ul",
  "ol",
  "blockquote",
  "dt",
  "dd",
  "dl",
]);
const QUOTE_CLASSES = ["quoteb", "quote"];
/** Paragraph classes MIA uses for note bodies and their continuation paragraphs. */
const NOTE_CLASSES = ["information", "endnote"];
/** A plain-text numbered note: "2. Compare…", "(3) See…", "* Note…". */
const NUMBERED_NOTE = /^\(?(\d{1,3}|[*†‡]{1,3})[.)]?\)?\s+\S/;
const NUMBERED_NOTE_PREFIX = /^\s*\(?(\d{1,3}|[*†‡]{1,3})[.)]?\)?\s+/;
/** Private-use placeholder delimiters for pending references (never in real text). */
const PENDING_OPEN = String.fromCharCode(0xe000);
const PENDING_CLOSE = String.fromCharCode(0xe001);
/** Headings that open a page's notes section. */
const NOTES_HEADING = /^(notes|endnotes|footnotes|editorial notes|notes and references)$/i;
/** MIA boilerplate left where a note was moved into the text. */
const MOVED_NOTE = /footnote has been moved into the body of the document/i;
/** Elements that can hold a note body; a reference's target must open one of them. */
const NOTE_BLOCKS = new Set([
  "p",
  "li",
  "td",
  "dd",
  "dt",
  "div",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);
/** MIA's Lenin Collected Works mark editorial endnotes as fw…E123 (author footnotes are fw…P123F01). */
const EDITORIAL_NOTE_ID = /^fw.*E\d+$/i;
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
  /** Unrecognised elements read as plain text, by tag name. */
  readonly unknown = new Map<string, number>();
  /** References whose target could not be found while walking; see resolvePendingRefs. */
  private readonly pendingRefs: { label: string; original: string }[] = [];
  /** Blocks dropped after the notes section started (reported, never silent). */
  private readonly droppedAfterNotes: string[] = [];
  private inNotesArea = false;
  private currentNote: NormalizedBlock | null = null;
  private currentNoteEditorial = false;

  constructor(private readonly body: Element) {
    liftTables(body);
  }

  run(): void {
    this.collectReferences();
    this.walk(this.body, false);
    this.resolvePendingRefs();
    this.dropEditorSignedNotes();
    if (this.droppedAfterNotes.length) {
      const sample = this.droppedAfterNotes
        .slice(0, 3)
        .map((t) => `"${t.trim()}"`)
        .join(", ");
      this.warnings.add(
        `dropped ${this.droppedAfterNotes.length} block(s) after the notes section, e.g. ${sample}; check none is text`,
      );
    }
    const editorialRefs = [...this.targets.values()].filter((n) => n.editorial).length;
    if (editorialRefs)
      this.warnings.add(`dropped ${editorialRefs} editorial note(s) and their references`);
    for (const [tag, count] of this.unknown) {
      this.warnings.add(
        `unrecognised element <${tag}> (${count}×) read as plain text; check the output`,
      );
    }
  }

  /** Turns pending references into <fn> when a note with that label exists, else restores them. */
  private resolvePendingRefs(): void {
    if (this.pendingRefs.length === 0) return;
    const labels = new Set(this.notes.filter((n) => n.type === "footnote").map((n) => n.label));
    const pattern = new RegExp(`${PENDING_OPEN}(\\d+)${PENDING_CLOSE}`, "g");
    const resolve = (b: NormalizedBlock) => {
      b.text = b.text.replace(pattern, (_, i: string) => {
        const ref = this.pendingRefs[Number(i)];
        if (!ref) return "";
        return labels.has(ref.label) ? `<fn ref="${ref.label}"/>` : ref.original;
      });
    };
    this.blocks.forEach(resolve);
    this.notes.forEach(resolve);
  }

  /**
   * Notes signed "—Ed." are by later editors even when marked up like author notes (MIA's
   * Lenin pages). The signature is only known once the note is complete, so they are removed
   * after the walk, together with their references in the text.
   */
  private dropEditorSignedNotes(): void {
    const signed = this.notes.filter(
      (n) =>
        n.type === "footnote" && /[—–-]\s*Ed\.?\s*$/.test(tidy(n.text.replace(/<[^>]+>/g, ""))),
    );
    if (signed.length === 0) return;
    const labels = new Set(signed.map((n) => n.label));
    const strip = (b: NormalizedBlock) => {
      for (const label of labels) b.text = b.text.split(`<fn ref="${label}"/>`).join("");
    };
    const kept = this.notes.filter((n) => !signed.includes(n));
    this.notes.length = 0;
    this.notes.push(...kept);
    this.blocks.forEach(strip);
    this.notes.forEach(strip);
    this.warnings.add(`dropped ${signed.length} note(s) signed "—Ed." (editors' notes)`);
  }

  /** Footnote references: <sup class="enote|anote|ednote"><a href="#X">…</a></sup>. */
  private collectReferences() {
    const byId = new Map<string, Element>();
    for (const el of descendants(this.body)) {
      const id = attr(el, "name") ?? attr(el, "id");
      if (id !== undefined && !byId.has(id)) byId.set(id, el);
    }
    // A note's marker opens its block (p.information, p.endnote, a sidebar span…). Links whose
    // target sits inside running text are back-links from a note to its reference, not references.
    const opensBlock = (target: Element): boolean => {
      for (let p = target.parentNode; p && isElement(p as Node); p = (p as Element).parentNode) {
        const block = p as Element;
        if (NOTE_BLOCKS.has(block.tagName) || hasClass(block, "footnote-as-sidebar")) {
          return !textBefore(block, target).trim();
        }
      }
      return false;
    };
    for (const el of descendants(this.body)) {
      if (el.tagName !== "sup") continue;
      const link = [...descendants(el)].find(
        (d) => d.tagName === "a" && (attr(d, "href") ?? "").startsWith("#"),
      );
      const target = link && attr(link, "href")?.slice(1);
      if (!target || (attr(link, "name") ?? attr(link, "id")) === target) continue;
      const targetEl = byId.get(target);
      if (!targetEl || !opensBlock(targetEl)) continue;
      this.targets.set(target, {
        label: NOTE_LABEL(textOf(link)),
        editorial: hasClass(el, "ednote") || EDITORIAL_NOTE_ID.test(target),
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
    if (el.tagName !== "p") return false;
    if (CHROME_CLASSES.some((c) => hasClass(el, c))) return true;
    if (MOVED_NOTE.test(textOf(el))) return true;
    const links = [...descendants(el)].filter((d) => d.tagName === "a" && attr(d, "href"));
    return (
      links.length === 1 &&
      tidy(textOf(el)) === tidy(textOf(links[0] as Element)) &&
      NAV_LINK.test(tidy(textOf(el)))
    );
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
        // A "Notes" heading opens the notes area; it is page structure, not text of the work.
        if (NOTES_HEADING.test(tidy(textOf(el)))) {
          this.inNotesArea = true;
          continue;
        }
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
        if (this.isNavigationTable(el)) {
          this.warnings.add("dropped navigation table(s)");
        } else if (this.isLayoutTable(el)) {
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
      if (tag === "pre") {
        flushLoose();
        const text = this.preformatted(el);
        if (text) this.emit({ type: quote ? "blockquote" : "paragraph", text });
        continue;
      }
      if (tag === "figcaption") {
        flushLoose();
        const text = this.inline(el);
        if (text) this.emit({ type: "caption", text });
        continue;
      }
      if (DROPPED_ELEMENTS.has(tag)) {
        flushLoose();
        this.warnings.add(`dropped <${tag}> element(s)`);
        continue;
      }
      if (hasClass(el, "footnote-as-sidebar")) {
        flushLoose();
        if (!this.sidebarNote(el)) this.walk(el, quote);
        continue;
      }
      if (CONTAINER_TAGS.has(tag)) {
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
    // Continuation of the current note: MIA's notes class, or a quotation/indented paragraph
    // (a note can quote verse, as Capital ch. 15 n. 226 does), or any paragraph when the
    // note so far is only its number.
    const continues =
      NOTE_CLASSES.some((c) => hasClass(el, c)) ||
      [...INDENT_CLASSES, ...QUOTE_CLASSES].some((c) => hasClass(el, c)) ||
      (this.currentNote !== null && !this.currentNote.text);
    // An editorial note's continuation goes with it; otherwise continue only an open note
    // (with no open note, fall through: it may be a plain-text numbered note).
    if (this.inNotesArea && continues && this.currentNoteEditorial) return;
    if (this.inNotesArea && continues && this.currentNote) {
      let text = this.inline(el);
      if (INDENT_CLASSES.some((c) => hasClass(el, c)) && text) text = `<indent level="1"/>${text}`;
      if (text) {
        this.currentNote.text = this.currentNote.text
          ? `${this.currentNote.text}<br/><br/>${text}`
          : text;
      }
      return;
    }
    // In the notes section, "2. Compare on this point…" is a note even without an anchor
    // (older pages number their notes in plain text).
    const numbered = this.inNotesArea ? NUMBERED_NOTE.exec(tidy(textOf(el))) : null;
    if (numbered?.[1]) {
      const label = numbered[1];
      const text = this.inline(el).replace(NUMBERED_NOTE_PREFIX, "");
      this.currentNoteEditorial = false;
      this.currentNote = { type: "footnote", label, text };
      this.notes.push(this.currentNote);
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

  /**
   * A note shown beside the text (MIA's Lenin pages: span.footnote-as-sidebar), in the
   * middle of the body. It becomes a footnote but must not end the body the way the
   * notes area at the bottom of a page does. Returns false if it is not a note.
   */
  private sidebarNote(el: Element): boolean {
    const start = this.noteStart(el);
    if (!start) return false;
    if (start.editorial) return true;
    const label =
      NOTE_LABEL(textOf(start.anchor)) || this.targets.get(start.name)?.label || start.name;
    const text = this.inline(el, true, start.anchor);
    if (text) this.notes.push({ type: "footnote", label, text });
    return true;
  }

  /** A table whose every non-empty cell is just a link ("Previous Chapter | Next Chapter"). */
  private isNavigationTable(table: Element): boolean {
    const cells = this.cellsOf(table).filter((c) => tidy(textOf(c)));
    return (
      cells.length > 0 &&
      cells.every((c) => {
        const linked = [...descendants(c)]
          .filter((d) => d.tagName === "a" && attr(d, "href"))
          .map((a) => textOf(a))
          .join("");
        return tidy(linked) === tidy(textOf(c));
      })
    );
  }

  /** <pre>: keep its lines as <br/> breaks, leading spaces as indentation, blank lines as stanza breaks. */
  private preformatted(el: Element): string {
    const raw = el.childNodes.map((c) => this.inlineNode(c)).join("");
    const lines = raw
      .replace(/\r\n?/g, "\n")
      .replace(/<br\/>/g, "\n")
      .split("\n");
    while (lines.length && !lines[0]?.trim()) lines.shift();
    while (lines.length && !lines.at(-1)?.trim()) lines.pop();
    return lines
      .map((line) => {
        const body = line.replace(/[ \t\u00a0]+/g, " ").trim();
        return /^[ \t\u00a0]{2,}\S/.test(line) && body ? `<indent level="1"/>${body}` : body;
      })
      .join("<br/>");
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
        // The link may also wrap the sup: <a href="#2"><sup>[2]</sup></a>.
        const parent =
          el.parentNode && isElement(el.parentNode as Node) ? (el.parentNode as Element) : null;
        const wrapping =
          parent?.tagName === "a" && (attr(parent, "href") ?? "").startsWith("#")
            ? parent
            : undefined;
        const href = (link ?? wrapping) && attr((link ?? wrapping) as Element, "href");
        const target = href?.slice(1);
        const note = target ? this.targets.get(target) : undefined;
        if (note) return note.editorial ? "" : `<fn ref="${note.label.replace(/"/g, "")}"/>`;
        const label = NOTE_LABEL(textOf(el));
        if (target && /^[\w*†‡]{1,8}$/.test(label)) {
          // A reference whose note has no anchor (plain "2. Compare…" notes): resolved after
          // the walk, once all notes are known (resolvePendingRefs).
          this.pendingRefs.push({ label, original: this.wrap("sup", el, skip) });
          return `${PENDING_OPEN}${this.pendingRefs.length - 1}${PENDING_CLOSE}`;
        }
        return this.wrap("sup", el, skip);
      }
      case "img":
        this.warnings.add("dropped image(s)");
        return "";
      case "script":
      case "style":
        return "";
      default:
        // a, span, font, u, small, tt …: keep the text, drop the element. Anything we do not
        // recognise is counted, so a new kind of page shows up as a warning, not silently.
        if (hasClass(el, "footnote-as-sidebar") && this.sidebarNote(el)) return "";
        if (!KNOWN_INLINE.has(el.tagName))
          this.unknown.set(el.tagName, (this.unknown.get(el.tagName) ?? 0) + 1);
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
    if (this.inNotesArea && block.type === "table") {
      // In the notes area a content table (navigation tables are dropped earlier) belongs to the
      // note before it: lifted out of the note by liftTables, or placed right after its number.
      if (this.currentNote && !this.currentNoteEditorial) {
        if (!this.currentNote.text) this.currentNote.text = "[table]";
        this.notes.push(block);
      }
      return;
    }
    if (this.inNotesArea && block.type !== "footnote") {
      // After the notes start, remaining blocks are usually page furniture (credits, links).
      // Never drop silently: the count is reported so lost text would be noticed.
      this.droppedAfterNotes.push(block.text.replace(/<[^>]+>/g, "").slice(0, 60));
      return;
    }
    this.blocks.push(block);
  }
}

export const MiaAdapter: SourceAdapter = {
  name: "mia",
  version: "1.1.0",
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
