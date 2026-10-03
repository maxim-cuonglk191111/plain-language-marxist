export type Severity = "error" | "warning";

export type Issue = {
  severity: Severity;
  /** Stable machine-readable code, e.g. "rendering/not-contiguous". */
  code: string;
  /** Repo-relative path with forward slashes. */
  file: string;
  line?: number;
  message: string;
};

export function formatReport(issues: readonly Issue[]): string {
  if (issues.length === 0) return "No problems found.";
  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }
  const lines: string[] = [];
  for (const [file, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(file);
    for (const i of list.sort((a, b) => (a.line ?? 0) - (b.line ?? 0))) {
      const where = i.line === undefined ? "" : `:${i.line}`;
      lines.push(`  ${i.severity.padEnd(7)} ${where.padEnd(6)} ${i.message}  [${i.code}]`);
    }
  }
  const errors = issues.filter((i) => i.severity === "error").length;
  lines.push("", `${errors} error(s), ${issues.length - errors} warning(s)`);
  return lines.join("\n");
}
