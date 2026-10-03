// Builds the static site from e2e/fixture-repo for the end-to-end tests.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
// Relative to the repo root: with shell: true on Windows, absolute paths with spaces would split.
const fixture = "e2e/fixture-repo";
const out = "e2e/.build";
const run = (args, env = {}) =>
  execFileSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });

run(["plm", "build", "--root", fixture, "--out", out]);
run(["--filter", "@plm/web", "build"], {
  PLM_DATA_DIR: fileURLToPath(new URL("./.build/data/v1", import.meta.url)),
});
