import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { buildData, formatReport } from "@plm/content";

/** Release id and commit from git: "2026.10.03-1a2b3c4" (commit date, not wall clock, so builds are reproducible). */
export function gitRelease(root: string): { release: string; commit: string } {
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    const commit = git("rev-parse", "HEAD");
    const date = git("log", "-1", "--format=%cs").replace(/-/g, ".");
    const dirty = git("status", "--porcelain", "--", "content", "governance.yml") !== "";
    return { release: `${date}-${commit.slice(0, 7)}${dirty ? "-dirty" : ""}`, commit };
  } catch {
    return { release: "unversioned", commit: "unknown" };
  }
}

export function runBuild(options: { root: string; out: string }): number {
  const root = resolve(options.root);
  const { release, commit } = gitRelease(root);
  const result = buildData({ root, out: resolve(options.out), release, contentCommit: commit });
  if (!result.ok) {
    console.error(formatReport(result.issues));
    console.error("\nBuild refused: plm validate reports errors.");
    return 1;
  }
  const c = result.manifest.counts;
  console.log(
    `Built release ${release}: ${c.works} work(s), ${c.documents} document(s), ${c.passages} passages, ` +
      `${c.renderings} renderings, ${c.terms} terms → ${options.out}/data/v1/ (${result.files.length} files)`,
  );
  return 0;
}
