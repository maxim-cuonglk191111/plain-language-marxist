// Packs a release (SDD §14.1): the built site, the content, the data manifest and
// checksums, into release/. Run after `pnpm build:site`. Prints the release id.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = "release";
const manifestPath = "dist/data/v1/manifest.json";
for (const required of ["apps/web/out/index.html", manifestPath]) {
  if (!existsSync(`${root}/${required}`)) {
    console.error(`release: ${required} is missing; run pnpm build:site first`);
    process.exit(1);
  }
}

rmSync(`${root}/${out}`, { recursive: true, force: true });
mkdirSync(`${root}/${out}`);
// Relative paths only: GNU tar reads "C:/..." as a remote host.
const tar = (archive, args) =>
  execFileSync("tar", ["-czf", `${out}/${archive}`, ...args], { cwd: root, stdio: "inherit" });
tar("site.tar.gz", ["-C", "apps/web/out", "."]);
tar("content.tar.gz", ["content", "governance.yml", "LICENSE-CONTENT", "LICENSING.md"]);
copyFileSync(`${root}/${manifestPath}`, `${root}/${out}/manifest.json`);

const files = ["site.tar.gz", "content.tar.gz", "manifest.json"];
const sums = files.map(
  (f) =>
    `${createHash("sha256")
      .update(readFileSync(`${root}/${out}/${f}`))
      .digest("hex")}  ${f}`,
);
writeFileSync(`${root}/${out}/checksums.txt`, `${sums.join("\n")}\n`);

const { release } = JSON.parse(readFileSync(`${root}/${manifestPath}`, "utf8"));
console.log(release);
