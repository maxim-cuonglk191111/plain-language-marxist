// Where the reader is on the page (task 031): the row crossing the reading line.

/** The reading line sits a little below the sticky bar, about a third down the screen. */
export const readingLine = () => Math.round(window.innerHeight * 0.3);

export function readerRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".rows > .row")];
}

/**
 * The last row whose top is above the reading line (binary search: rows are in
 * page order), and how far through it the line is (0–1).
 */
export function rowAtLine(rows: readonly HTMLElement[], line = readingLine()) {
  let lo = 0;
  let hi = rows.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((rows[mid]?.getBoundingClientRect().top ?? Infinity) <= line) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const rect = rows[found]?.getBoundingClientRect();
  const fraction = rect && rect.height > 0 ? (line - rect.top) / rect.height : 0;
  return { index: found, fraction: Math.min(Math.max(fraction, 0), 1) };
}

/** The first row the reader can see below the sticky reader bar: where reading aloud starts. */
export function firstVisibleRow(rows: readonly HTMLElement[]): number {
  const top = (document.querySelector(".reader-bar")?.getBoundingClientRect().bottom ?? 0) + 8;
  // A row only peeking out under the bar does not count: half of it, or 48px, must show.
  const i = rows.findIndex((r) => {
    const box = r.getBoundingClientRect();
    return box.bottom - top >= Math.min(48, box.height / 2);
  });
  return i === -1 ? 0 : i;
}

/** Single-key shortcuts must not fire while the reader types or uses a modifier. */
export function isTyping(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const t = e.target as HTMLElement | null;
  return Boolean(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? "")));
}
