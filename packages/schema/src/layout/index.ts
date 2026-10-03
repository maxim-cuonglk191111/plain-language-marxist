// Layout markup v1 — see docs/architecture/layout-markup.md.

export type ContainerTag = "i" | "b" | "sc";

export type LayoutNode =
  | { type: "text"; value: string }
  | { type: ContainerTag; children: LayoutNode[] }
  | { type: "a"; href: string; children: LayoutNode[] }
  | { type: "br" }
  | { type: "indent"; level: number }
  | { type: "fn"; ref: string };

export type LayoutResult =
  { ok: true; nodes: LayoutNode[] } | { ok: false; error: { message: string; offset: number } };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"' };
const TAG = /<(\/?)([a-z]+)((?:\s+[a-z]+="[^"]*")*)\s*(\/?)>/y;
const ATTR = /\s+([a-z]+)="([^"]*)"/g;
const ENTITY = /&(amp|lt|gt|quot);/y;
const HREF = /^(https:\/\/\S+|\/\S*)$/;
const FN_REF = /^[^\s"<>&]{1,8}$/;

type Frame = { node: Extract<LayoutNode, { children: LayoutNode[] }>; offset: number };

class ParseError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

function decodeAttr(raw: string): string {
  return raw.replace(/&(amp|lt|gt|quot);/g, (_, name: string) => ENTITIES[name] ?? "");
}

function readAttrs(raw: string, offset: number, allowed: readonly string[]): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const [, name, value] of raw.matchAll(ATTR)) {
    if (!name || value === undefined) continue;
    if (!allowed.includes(name)) throw new ParseError(`attribute "${name}" is not allowed`, offset);
    if (attrs.has(name)) throw new ParseError(`duplicate attribute "${name}"`, offset);
    attrs.set(name, decodeAttr(value));
  }
  for (const name of allowed) {
    if (!attrs.has(name)) throw new ParseError(`missing required attribute "${name}"`, offset);
  }
  return attrs;
}

export function parseLayout(text: string): LayoutResult {
  const root: LayoutNode[] = [];
  const stack: Frame[] = [];
  let buffer = "";
  let pos = 0;

  const current = (): LayoutNode[] => stack.at(-1)?.node.children ?? root;
  const flush = () => {
    if (buffer) current().push({ type: "text", value: buffer });
    buffer = "";
  };
  const atLineStart = () => {
    if (stack.length > 0 || buffer) return false;
    const last = root.at(-1);
    return last === undefined || last.type === "br";
  };

  try {
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === "&") {
        ENTITY.lastIndex = pos;
        const m = ENTITY.exec(text);
        buffer += m?.[1] ? (ENTITIES[m[1]] ?? "") : "&";
        pos = m ? ENTITY.lastIndex : pos + 1;
        continue;
      }
      if (ch === ">") throw new ParseError('unescaped ">" (write &gt;)', pos);
      if (ch !== "<") {
        buffer += ch;
        pos++;
        continue;
      }

      TAG.lastIndex = pos;
      const m = TAG.exec(text);
      if (!m) throw new ParseError('malformed tag or unescaped "<" (write &lt;)', pos);
      const [, closing, name = "", rawAttrs = "", selfClosing] = m;
      const tagOffset = pos;
      pos = TAG.lastIndex;

      if (closing) {
        if (rawAttrs || selfClosing)
          throw new ParseError(`malformed closing tag </${name}>`, tagOffset);
        const frame = stack.at(-1);
        if (!frame || frame.node.type !== name) {
          throw new ParseError(`unexpected closing tag </${name}>`, tagOffset);
        }
        flush();
        stack.pop();
        continue;
      }

      switch (name) {
        case "i":
        case "b":
        case "sc": {
          if (selfClosing) throw new ParseError(`<${name}> cannot be self-closing`, tagOffset);
          readAttrs(rawAttrs, tagOffset, []);
          flush();
          const node: LayoutNode = { type: name, children: [] };
          current().push(node);
          stack.push({ node, offset: tagOffset });
          break;
        }
        case "a": {
          if (selfClosing) throw new ParseError("<a> cannot be self-closing", tagOffset);
          if (stack.some((f) => f.node.type === "a")) {
            throw new ParseError("<a> cannot be nested inside another <a>", tagOffset);
          }
          const href = readAttrs(rawAttrs, tagOffset, ["href"]).get("href") ?? "";
          if (!HREF.test(href)) {
            throw new ParseError(
              'href must be "https://…" or a site path starting with "/"',
              tagOffset,
            );
          }
          flush();
          const node: LayoutNode = { type: "a", href, children: [] };
          current().push(node);
          stack.push({ node, offset: tagOffset });
          break;
        }
        case "br": {
          if (!selfClosing) throw new ParseError("<br> must be written <br/>", tagOffset);
          readAttrs(rawAttrs, tagOffset, []);
          flush();
          current().push({ type: "br" });
          break;
        }
        case "indent": {
          if (!selfClosing)
            throw new ParseError('<indent> must be written <indent level="N"/>', tagOffset);
          const raw = readAttrs(rawAttrs, tagOffset, ["level"]).get("level") ?? "";
          const level = Number(raw);
          if (!/^[1-6]$/.test(raw)) throw new ParseError("indent level must be 1–6", tagOffset);
          if (!atLineStart()) {
            throw new ParseError("<indent/> is only allowed at the start of a line", tagOffset);
          }
          root.push({ type: "indent", level });
          break;
        }
        case "fn": {
          if (!selfClosing) throw new ParseError('<fn> must be written <fn ref="…"/>', tagOffset);
          const ref = readAttrs(rawAttrs, tagOffset, ["ref"]).get("ref") ?? "";
          if (!FN_REF.test(ref)) throw new ParseError(`invalid footnote ref "${ref}"`, tagOffset);
          flush();
          current().push({ type: "fn", ref });
          break;
        }
        default:
          throw new ParseError(`tag <${name}> is not allowed`, tagOffset);
      }
    }
    const open = stack.at(-1);
    if (open) throw new ParseError(`unclosed <${open.node.type}>`, open.offset);
    flush();
    return { ok: true, nodes: root };
  } catch (e) {
    if (e instanceof ParseError)
      return { ok: false, error: { message: e.message, offset: e.offset } };
    throw e;
  }
}

const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, "&quot;");

export function serializeLayout(nodes: readonly LayoutNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return escapeText(node.value);
        case "i":
        case "b":
        case "sc":
          return `<${node.type}>${serializeLayout(node.children)}</${node.type}>`;
        case "a":
          return `<a href="${escapeAttr(node.href)}">${serializeLayout(node.children)}</a>`;
        case "br":
          return "<br/>";
        case "indent":
          return `<indent level="${node.level}"/>`;
        case "fn":
          return `<fn ref="${escapeAttr(node.ref)}"/>`;
      }
    })
    .join("");
}

function plainParts(nodes: readonly LayoutNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "br":
          return " ";
        case "indent":
        case "fn":
          return "";
        default:
          return plainParts(node.children);
      }
    })
    .join("");
}

/** Plain text used for hashing and checks: layout removed, NFC, whitespace collapsed. */
export function toPlainText(nodes: readonly LayoutNode[]): string {
  return plainParts(nodes).normalize("NFC").replace(/\s+/g, " ").trim();
}

/** All nodes of the given type, depth-first. */
export function collectNodes<T extends LayoutNode["type"]>(
  nodes: readonly LayoutNode[],
  type: T,
): Extract<LayoutNode, { type: T }>[] {
  const found: Extract<LayoutNode, { type: T }>[] = [];
  const visit = (list: readonly LayoutNode[]) => {
    for (const node of list) {
      if (node.type === type) found.push(node as Extract<LayoutNode, { type: T }>);
      if ("children" in node) visit(node.children);
    }
  };
  visit(nodes);
  return found;
}
