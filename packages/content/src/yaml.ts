import { Document, LineCounter, isScalar, parseDocument, visit } from "yaml";
import type { z } from "zod";

export type ParsedFile<T> =
  | { ok: true; data: T; lineOf: (path: readonly PropertyKey[]) => number | undefined }
  | { ok: false; problems: { line?: number; message: string }[] };

/**
 * Parses YAML and validates it against a schema. Problems carry the line of the
 * offending node, so hand-edited files get precise error locations.
 */
export function parseContent<S extends z.ZodType>(
  text: string,
  schema: S,
): ParsedFile<z.output<S>> {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: false });
  if (doc.errors.length > 0) {
    return {
      ok: false,
      problems: doc.errors.map((e) => ({
        line: lineCounter.linePos(e.pos[0]).line,
        message: `YAML: ${e.message.split("\n")[0]}`,
      })),
    };
  }

  const lineOf = (path: readonly PropertyKey[]): number | undefined => {
    for (let n = path.length; n >= 0; n--) {
      const node = doc.getIn(path.slice(0, n) as unknown[], true) as
        { range?: [number, number, number] } | undefined;
      if (node?.range) return lineCounter.linePos(node.range[0]).line;
    }
    return undefined;
  };

  const result = schema.safeParse(doc.toJS());
  if (!result.success) {
    return {
      ok: false,
      problems: result.error.issues.map((issue) => {
        const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
        const line = lineOf(issue.path);
        return line === undefined
          ? { message: `${where}${issue.message}` }
          : { line, message: `${where}${issue.message}` };
      }),
    };
  }
  return { ok: true, data: result.data, lineOf };
}

const FLOW_MAX_ITEMS = 12;
const FLOW_MAX_ITEM_LENGTH = 48;

/**
 * Deterministic writer. Data is validated first (writers never produce invalid
 * files) and Zod's output fixes the key order to the schema's order. Short
 * lists of scalars are written inline (`covers: [p00031, p00032]`), multi-line
 * text as literal blocks, and nothing is ever line-folded.
 */
export function stringifyContent(schema: z.ZodType, data: unknown): string {
  const doc = new Document(schema.parse(data));
  visit(doc, {
    Seq(_, seq) {
      const short = seq.items.every(
        (item) =>
          isScalar(item) &&
          !(
            typeof item.value === "string" &&
            (item.value.includes("\n") || item.value.length > FLOW_MAX_ITEM_LENGTH)
          ),
      );
      if (short && seq.items.length <= FLOW_MAX_ITEMS) seq.flow = true;
    },
  });
  return doc.toString({ lineWidth: 0, blockQuote: "literal", flowCollectionPadding: false });
}
