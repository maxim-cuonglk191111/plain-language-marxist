/** Bytes exactly as fetched, plus where they came from. */
export type RawSource = {
  /** The canonical source URL, e.g. https://www.marxists.org/archive/…/ch01.htm */
  url: string;
  /** The URL actually fetched, if different (e.g. a Wayback Machine raw snapshot). */
  via?: string;
  retrievedAt: string;
  bytes: Uint8Array;
};

export type BlockType =
  | "heading"
  | "paragraph"
  | "blockquote"
  | "list_item"
  | "footnote"
  | "table"
  | "caption"
  | "separator";

/** One source block; `text` is layout markup (docs/architecture/layout-markup.md). */
export type NormalizedBlock = {
  type: BlockType;
  text: string;
  level?: number;
  label?: string;
};

export type NormalizedDocument = {
  title: string;
  blocks: NormalizedBlock[];
  /** Metadata found on the page (e.g. "Translated", "Source"), for the import report. */
  metadata: Record<string, string>;
  /** Things the parser dropped or approximated, for the import report. */
  warnings: string[];
};

export interface SourceAdapter {
  readonly name: string;
  readonly version: string;
  canHandle(url: URL): boolean;
  /** Deterministic: the same bytes always give the same output. */
  parse(raw: RawSource): NormalizedDocument;
}
