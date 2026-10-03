import { mkdirSync, writeFileSync } from "node:fs";
import { buildJsonSchemas } from "../src/json-schema.ts";

const dir = new URL("../json-schema/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [file, content] of Object.entries(buildJsonSchemas())) {
  writeFileSync(new URL(file, dir), content);
  console.log(`wrote json-schema/${file}`);
}
