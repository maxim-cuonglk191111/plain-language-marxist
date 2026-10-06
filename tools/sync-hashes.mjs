import fs from "node:fs";
import crypto from "node:crypto";
import yaml from "../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js";

const sha256 = (s) => "sha256:" + crypto.createHash("sha256").update(s, "utf8").digest("hex");

export function syncHashes(chapterDir) {
  const sourcePath = `${chapterDir}/source.yml`;
  const plainPath = `${chapterDir}/en-plain.yml`;

  const source = yaml.parse(fs.readFileSync(sourcePath, "utf8"));
  const plain = yaml.parse(fs.readFileSync(plainPath, "utf8"));

  const pMap = new Map();
  for (const p of source.passages) {
    pMap.set(p.id, p.hash);
  }

  for (const r of Object.values(plain.renderings)) {
    const hashes = r.covers.map((id) => pMap.get(id));
    const expected = sha256(hashes.join("\n"));
    r.based_on = expected;
  }

  fs.writeFileSync(plainPath, yaml.stringify(plain), "utf8");
  console.log(`Synced hashes for ${chapterDir}`);
}

const dir = process.argv[2] || "content/works/engels/1880/socialism-utopian-scientific/ch01";
syncHashes(dir);
