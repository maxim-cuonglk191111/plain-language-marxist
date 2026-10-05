// Post-processes Next's static export (apps/web/out) so any plain static host
// serves the site's URLs, with no rewrites or server config (SDD §10.1, §18):
//
// 1. Source-shaped pages: "ch01.htm.html" becomes "ch01.htm" (served as HTML
//    because of the .htm extension).
// 2. Other pages: "vocabulary/bourgeoisie.html" becomes
//    "vocabulary/bourgeoisie/index.html", so "/vocabulary/bourgeoisie/" works.
// 3. RSC payloads (*.txt, __next.*) are dropped: they serve only next/link client
//    navigation, and the reader uses plain links with full page loads.
// 4. The static data contract is copied to /data/v1/, the public read API.
// 5. The placeholder page /paths/_none, built only when there are no reading
//    paths (NO_PATHS in src/lib/paths.ts; a static export cannot leave a
//    dynamic route empty), is deleted.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out/", import.meta.url));
const data =
  process.env.PLM_DATA_DIR ?? fileURLToPath(new URL("../../../dist/data/v1/", import.meta.url));
const KEEP_AS_IS = new Set(["index.html", "404.html"]);

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(out);

const PLACEHOLDER = join("paths", "_none");

let dropped = 0;
for (const file of files) {
  const name = file.split(sep).pop();
  if (relative(out, file).startsWith(PLACEHOLDER)) {
    rmSync(file, { force: true });
  } else if (name.endsWith(".txt") || name.startsWith("__next.")) {
    rmSync(file, { force: true });
    dropped++;
  }
}

let moved = 0;
for (const file of files) {
  if (!file.endsWith(".html") || !existsSync(file)) continue;
  const rel = relative(out, file).split(sep).join("/");
  if (KEEP_AS_IS.has(rel) || rel.startsWith("_")) continue;
  const target = /\.html?\.html$/.test(rel)
    ? file.slice(0, -".html".length)
    : join(file.slice(0, -".html".length), "index.html");
  if (existsSync(target) && statSync(target).isDirectory())
    rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  renameSync(file, target);
  moved++;
}

// Remove directories emptied by dropping the payloads.
const prune = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      prune(full);
      if (readdirSync(full).length === 0) rmSync(full, { recursive: true });
    }
  }
};
prune(out);

if (!existsSync(join(data, "manifest.json"))) {
  console.error(`finalize-export: no data contract at ${data}; run plm build first`);
  process.exit(1);
}
cpSync(data, join(out, "data/v1"), { recursive: true });
console.log(
  `finalize-export: ${moved} page(s) moved to clean paths, ${dropped} RSC payload file(s) dropped, data/v1 copied`,
);
