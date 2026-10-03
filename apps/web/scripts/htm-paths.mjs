// Next's static export writes /archive/…/ch01.htm as "ch01.htm.html", plus RSC
// payloads ("ch01.htm.txt" and a "ch01.htm/" directory) used only for next/link
// client navigation. The reader uses plain <a> links (full page loads), so the
// payloads are dropped and the page is renamed to "ch01.htm": any static host
// then serves the source-shaped URL directly, as HTML because of the .htm
// extension (SDD §10.1, §18).
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out/", import.meta.url));
let renamed = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!existsSync(full)) continue; // removed earlier in this pass
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.html?\.html$/.test(entry)) {
      const target = full.slice(0, -".html".length);
      rmSync(target, { recursive: true, force: true });
      rmSync(`${target}.txt`, { force: true });
      renameSync(full, target);
      renamed++;
    }
  }
};
walk(out);
console.log(`htm-paths: renamed ${renamed} page(s) to their source-shaped .htm paths`);
