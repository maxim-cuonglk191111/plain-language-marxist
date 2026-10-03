import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildJsonSchemas } from "./json-schema.ts";

describe("exported JSON Schemas", () => {
  it.each(Object.entries(buildJsonSchemas()))(
    "json-schema/%s is up to date (run: pnpm --filter @plm/schema export)",
    (file, expected) => {
      const committed = readFileSync(new URL(`../json-schema/${file}`, import.meta.url), "utf8");
      expect(committed).toBe(expected);
    },
  );
});
