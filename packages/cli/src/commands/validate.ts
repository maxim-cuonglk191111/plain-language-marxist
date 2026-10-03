import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { formatReport, validate } from "@plm/content";

export type ValidateCliOptions = { json?: boolean };

/** Runs all content invariants. Exit code 1 if any error; warnings alone pass. */
export function runValidate(root: string, options: ValidateCliOptions): number {
  const abs = resolve(root);
  if (!existsSync(abs)) {
    console.error(`No such directory: ${abs}`);
    return 2;
  }
  const issues = validate(abs);
  if (options.json) {
    console.log(JSON.stringify(issues, null, 2));
  } else {
    console.log(formatReport(issues));
  }
  return issues.some((i) => i.severity === "error") ? 1 : 0;
}
