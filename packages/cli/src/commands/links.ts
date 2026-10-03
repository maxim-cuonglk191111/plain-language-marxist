// plm check-links: broken links in the built site (SDD §14.2).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DEFAULT_POLICY, safeFetch } from "@plm/parser";
import type { Fetcher } from "./import.ts";

export type BrokenLink = { page: string; href: string; reason: string };

function pages(site: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== "_next" && entry !== "data") walk(full);
      } else if (/\.html?$/.test(entry)) out.push(full);
    }
  };
  walk(site);
  return out.sort();
}

/** The file a static host would serve for a site path, or null. */
function resolvePath(site: string, path: string): string | null {
  const file = join(site, decodeURIComponent(path));
  if (existsSync(file) && statSync(file).isFile()) return file;
  const index = join(file, "index.html");
  return existsSync(index) ? index : null;
}

const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const HREF = /<a\s[^>]*href="([^"]+)"/g;

export async function checkLinks(
  options: { site: string; external: boolean },
  fetcher: Fetcher = safeFetch,
): Promise<{ checked: number; broken: BrokenLink[] }> {
  const broken: BrokenLink[] = [];
  const external = new Map<string, string>(); // url -> first page using it
  const idCache = new Map<string, Set<string | undefined>>();
  const idsOf = (file: string) => {
    let set = idCache.get(file);
    if (!set) {
      set = ids(readFileSync(file, "utf8"));
      idCache.set(file, set);
    }
    return set;
  };
  let checked = 0;

  for (const file of pages(options.site)) {
    const page = `/${relative(options.site, file).split(sep).join("/")}`;
    const html = readFileSync(file, "utf8");
    for (const [, raw = ""] of html.matchAll(HREF)) {
      const href = raw.replace(/&amp;/g, "&");
      checked++;
      if (href.startsWith("mailto:")) continue;
      if (href.startsWith("http://")) {
        broken.push({ page, href, reason: "insecure http:// link" });
        continue;
      }
      if (href.startsWith("https://")) {
        if (!external.has(href)) external.set(href, page);
        continue;
      }
      const [pathPart = "", fragment] = href.split("#", 2);
      const target =
        pathPart === "" ? file : resolvePath(options.site, pathPart.split("?")[0] ?? "");
      if (!target) {
        broken.push({ page, href, reason: "no such page" });
      } else if (fragment && !idsOf(target).has(fragment)) {
        broken.push({ page, href, reason: `no element with id "${fragment}"` });
      }
    }
  }

  if (options.external) {
    for (const [url, page] of external) {
      try {
        await fetcher(url, {
          ...DEFAULT_POLICY,
          allowedHosts: [new URL(url).hostname],
          maxRedirects: 5,
        });
      } catch (e) {
        broken.push({ page, href: url, reason: (e as Error).message });
      }
    }
  }
  return { checked, broken };
}

export function linksReport(result: { checked: number; broken: readonly BrokenLink[] }): string {
  const lines = [
    `# Link check`,
    "",
    `${result.checked} links checked; ${result.broken.length} broken.`,
  ];
  if (result.broken.length) {
    lines.push(
      "",
      "| Page | Link | Problem |",
      "|---|---|---|",
      ...result.broken.map((b) => `| ${b.page} | ${b.href} | ${b.reason} |`),
    );
  }
  return `${lines.join("\n")}\n`;
}
