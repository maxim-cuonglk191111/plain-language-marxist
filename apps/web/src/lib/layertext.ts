// The text of one layer cell, as highlights see it (task 031 D). Labels, notices
// and badges are left out. A Plain English term mark counts as its project-default
// wording (data-default, kept by TermCards), so a highlight does not break when
// the reader switches to "Original terms" and the mark's words change.

const SKIP = ".layer-label, .badge, .notice, .text-note, .row-tools";

type Segment = { start: number; text: string; node?: Text; el?: HTMLElement };
export type LayerText = { text: string; segments: Segment[] };

export function layerText(cell: Element): LayerText {
  const segments: Segment[] = [];
  let text = "";
  const push = (seg: Omit<Segment, "start">) => {
    segments.push({ ...seg, start: text.length });
    text += seg.text;
  };
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        push({ node: child as Text, text: child.nodeValue ?? "" });
      } else if (child instanceof HTMLElement) {
        if (child.matches(SKIP)) continue;
        const def = child.dataset["default"];
        if (child.matches("a.term") && def !== undefined && def !== child.textContent) {
          push({ el: child, text: def });
          continue;
        }
        walk(child);
        // Block boundaries read as a space, so words in two paragraphs never join.
        if (/^(P|H[1-6]|BLOCKQUOTE|LI|DIV|TR)$/.test(child.tagName) && !text.endsWith(" "))
          push({ text: " " });
      }
    }
  };
  walk(cell);
  return { text, segments };
}

export function toRange(model: LayerText, start: number, end: number): Range | null {
  const range = document.createRange();
  const at = (offset: number, isEnd: boolean) => {
    const seg = model.segments.find((s) =>
      isEnd
        ? offset > s.start && offset <= s.start + s.text.length
        : offset >= s.start && offset < s.start + s.text.length,
    );
    if (!seg) return false;
    if (seg.node) {
      const o = Math.min(Math.max(offset - seg.start, 0), seg.node.length);
      if (isEnd) range.setEnd(seg.node, o);
      else range.setStart(seg.node, o);
    } else if (seg.el) {
      if (isEnd) range.setEndAfter(seg.el);
      else range.setStartBefore(seg.el);
    } else return false; // a block-boundary space: no node to anchor on
    return true;
  };
  // Move off block-boundary spaces onto real text.
  let s = start;
  while (s < end && !at(s, false)) s++;
  let e = end;
  while (e > s && !at(e, true)) e--;
  return e > s ? range : null;
}

/** A range boundary → offset in the layer text. */
function offsetOf(model: LayerText, container: Node, offset: number, isEnd: boolean): number {
  for (const seg of model.segments) {
    if (seg.node && seg.node === container) return seg.start + Math.min(offset, seg.text.length);
    if (seg.el?.contains(container)) return isEnd ? seg.start + seg.text.length : seg.start;
  }
  // The boundary sits between elements: count the segments before it.
  const point = document.createRange();
  point.setStart(container, offset);
  for (const seg of model.segments) {
    const n = seg.node ?? seg.el;
    if (n && point.comparePoint(n, 0) >= 0) return seg.start;
  }
  return model.text.length;
}

export function fromRange(model: LayerText, range: Range): { start: number; end: number } {
  return {
    start: offsetOf(model, range.startContainer, range.startOffset, false),
    end: offsetOf(model, range.endContainer, range.endOffset, true),
  };
}
