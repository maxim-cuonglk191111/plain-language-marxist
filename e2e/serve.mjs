// Minimal static server for apps/web/out, behaving like a plain static host:
// files by path, directory index.html, .htm served as HTML, 404.html otherwise.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../apps/web/out/", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(normalize(root))) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  const found = existsSync(file) && statSync(file).isFile();
  if (!found) file = join(root, "404.html");
  res.writeHead(found ? 200 : 404, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
