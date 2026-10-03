import { createHash } from "node:crypto";
import { parseLayout, toPlainText } from "@plm/schema";

const sha256 = (input: string) =>
  `sha256:${createHash("sha256").update(input, "utf8").digest("hex")}`;

/** Plain text of a layout-markup string, or null if the markup does not parse. */
export function plainText(layoutText: string): string | null {
  const result = parseLayout(layoutText);
  return result.ok ? toPlainText(result.nodes) : null;
}

/** Passage hash: sha256 of the normalized plain text, so layout-only edits keep the hash (SDD §5.3). */
export function passageHash(layoutText: string): string | null {
  const text = plainText(layoutText);
  return text === null ? null : sha256(text);
}

/** A rendering's based_on: sha256 over the covered passages' hashes, in coverage order (SDD §5.4). */
export function basedOnHash(passageHashes: readonly string[]): string {
  return sha256(passageHashes.join("\n"));
}

export function fileHash(content: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
