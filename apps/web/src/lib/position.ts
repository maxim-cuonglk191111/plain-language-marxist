// Where the reader is on the page (task 031): the row crossing the reading line.

/**
 * The reading line sits a little below the sticky bar, about a third down the screen.
 * When approaching the bottom of the page, it smoothly glides downward toward the
 * bottom of the viewport so that trailing passages on large or wide displays
 * cross the focus line and never get stuck in a dimmed state.
 */
export const readingLine = () => {
  if (typeof window === "undefined") return 200;
  const defaultLine = Math.round(window.innerHeight * 0.3);
  if (typeof document === "undefined" || !document.documentElement) return defaultLine;

  const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0;
  const viewportH = window.innerHeight;
  const scrollHeight = document.documentElement.scrollHeight;
  const maxScroll = scrollHeight - viewportH;

  if (maxScroll <= 0) return Math.round(viewportH * 0.5);

  const remaining = maxScroll - scrollY;
  const threshold = viewportH * 0.6;
  if (remaining < threshold) {
    const progress = (threshold - Math.max(0, remaining)) / threshold;
    return Math.round(defaultLine + progress * (viewportH * 0.55));
  }
  return defaultLine;
};

export function readerRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".rows > .row")];
}

/**
 * The last row whose top is above the reading line (binary search: rows are in
 * page order), and how far through it the line is (0–1).
 */
export function rowAtLine(rows: readonly HTMLElement[], line = readingLine()) {
  if (rows.length === 0) return { index: 0, fraction: 0 };
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

  // When scrolled near the very bottom, ensure the bottom-most visible row is selected
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0 && maxScroll - scrollY <= 32) {
      for (let i = rows.length - 1; i >= found; i--) {
        const r = rows[i]?.getBoundingClientRect();
        if (r && r.top < window.innerHeight && r.bottom > 0) {
          found = i;
          break;
        }
      }
    }
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
