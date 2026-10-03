import { z } from "zod";
import { CONTENT_SCHEMAS } from "./index.ts";

/**
 * JSON Schema for each content file, for editors and external tools.
 * Cross-field rules (superRefine) cannot be expressed in JSON Schema;
 * `plm validate` remains the authority.
 */
export function buildJsonSchemas(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, schema] of Object.entries(CONTENT_SCHEMAS)) {
    const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
    out[`${name}.schema.json`] =
      `${JSON.stringify({ title: `PLM ${name} file`, ...json }, null, 2)}\n`;
  }
  return out;
}
