import { lookup as dnsLookup } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

/**
 * Safe fetching for source ingestion (SDD §7.3). Not a general URL fetcher:
 * only allowlisted hosts, HTTPS only, every redirect hop re-validated, and
 * connections only to public addresses (checked at connect time, so DNS
 * rebinding cannot slip a private address in after validation).
 */

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv6");
}

/** True for loopback, private, link-local, reserved and multicast addresses (incl. IPv4-mapped IPv6). */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  if (family === 4) return BLOCKED.check(address, "ipv4");
  const lower = address.toLowerCase();
  const mapped = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower)?.[1];
  if (mapped) return BLOCKED.check(mapped, "ipv4");
  return BLOCKED.check(lower, "ipv6");
}

export type FetchPolicy = {
  /** Hosts that may be contacted, e.g. www.marxists.org, web.archive.org. */
  allowedHosts: readonly string[];
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
};

export const DEFAULT_POLICY: Omit<FetchPolicy, "allowedHosts"> = {
  maxBytes: 8 * 1024 * 1024,
  timeoutMs: 30_000,
  maxRedirects: 5,
};

export class FetchRefused extends Error {}

/** Throws FetchRefused unless the URL is https on an allowlisted host. */
export function checkUrl(raw: string, policy: Pick<FetchPolicy, "allowedHosts">): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchRefused(`not a valid URL: ${raw}`);
  }
  if (url.protocol !== "https:") throw new FetchRefused(`only https:// URLs are allowed: ${raw}`);
  if (url.username || url.password) throw new FetchRefused("URLs with credentials are not allowed");
  if (url.port && url.port !== "443") throw new FetchRefused(`non-standard port: ${url.port}`);
  if (isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) {
    throw new FetchRefused("IP-address URLs are not allowed; use an allowlisted host name");
  }
  if (!policy.allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new FetchRefused(`host ${url.hostname} is not on the source allowlist`);
  }
  return url;
}

/** A DNS lookup that refuses to hand out blocked addresses. */
export function guardedLookup(resolve: typeof dnsLookup = dnsLookup): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, "", 0);
      const list = addresses as unknown as { address: string; family: number }[];
      const bad = list.find((a) => isBlockedAddress(a.address));
      if (bad || list.length === 0) {
        return callback(
          new FetchRefused(
            `${hostname} resolves to a non-public address (${bad?.address ?? "none"})`,
          ),
          "",
          0,
        );
      }
      const first = list[0];
      if (!first) return callback(new FetchRefused(`${hostname} did not resolve`), "", 0);
      if ((options as { all?: boolean }).all)
        return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
      callback(null, first.address, first.family);
    });
  };
}

export type TransportResponse = {
  status: number;
  headers: Record<string, string | undefined>;
  body: Uint8Array;
};
export type Transport = (url: URL, policy: FetchPolicy) => Promise<TransportResponse>;

/** HTTPS transport using the guarded lookup, a byte cap and a timeout; never follows redirects itself. */
export const httpsTransport: Transport = (url, policy) =>
  new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: guardedLookup(),
        headers: {
          "user-agent": "plain-language-marxist-importer/0.1",
          "accept-encoding": "gzip, br, deflate",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > policy.maxBytes) {
            req.destroy(new FetchRefused(`response larger than ${policy.maxBytes} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          let body: Buffer = Buffer.concat(chunks);
          const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
          try {
            if (encoding === "gzip") body = gunzipSync(body);
            else if (encoding === "br") body = brotliDecompressSync(body);
            else if (encoding === "deflate") body = inflateSync(body);
          } catch (e) {
            reject(e);
            return;
          }
          if (body.length > policy.maxBytes) {
            reject(new FetchRefused(`response larger than ${policy.maxBytes} bytes`));
            return;
          }
          const headers: Record<string, string | undefined> = {};
          for (const [k, v] of Object.entries(res.headers))
            headers[k] = Array.isArray(v) ? v.join(", ") : v;
          resolve({ status: res.statusCode ?? 0, headers, body: new Uint8Array(body) });
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(policy.timeoutMs, () =>
      req.destroy(new FetchRefused(`timed out after ${policy.timeoutMs} ms`)),
    );
    req.on("error", reject);
    req.end();
  });

/** Fetches an allowlisted URL, re-validating every redirect hop. Returns the final URL and bytes. */
export async function safeFetch(
  raw: string,
  policy: FetchPolicy,
  transport: Transport = httpsTransport,
): Promise<{ url: string; body: Uint8Array }> {
  let url = checkUrl(raw, policy);
  for (let hop = 0; hop <= policy.maxRedirects; hop++) {
    const res = await transport(url, policy);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers["location"];
      if (!location) throw new FetchRefused(`redirect without a location from ${url.href}`);
      url = checkUrl(new URL(location, url).href, policy);
      continue;
    }
    if (res.status !== 200) throw new FetchRefused(`HTTP ${res.status} from ${url.href}`);
    return { url: url.href, body: res.body };
  }
  throw new FetchRefused(`more than ${policy.maxRedirects} redirects`);
}

/** Raw-mode Wayback Machine URL (original bytes, no archive toolbar) for the snapshot closest to `date`. */
export function waybackRawUrl(url: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `https://web.archive.org/web/${stamp}id_/${url}`;
}

/** Checks that a Wayback response really is a raw snapshot of `original`. */
export function isWaybackSnapshotOf(finalUrl: string, original: string): boolean {
  const m = /^https:\/\/web\.archive\.org\/web\/\d{4,14}id_\/(https?:\/\/.+)$/.exec(finalUrl);
  if (!m?.[1]) return false;
  const strip = (u: string) => u.replace(/^https?:\/\//, "").replace(/:80\//, "/");
  return strip(m[1]) === strip(original);
}
