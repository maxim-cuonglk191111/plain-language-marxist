import { describe, expect, it } from "vitest";
import {
  FetchRefused,
  checkUrl,
  guardedLookup,
  isBlockedAddress,
  isWaybackSnapshotOf,
  safeFetch,
  waybackRawUrl,
  type FetchPolicy,
  type Transport,
} from "./fetch.ts";
import { decodeHtml } from "./decode.ts";

const policy: FetchPolicy = {
  allowedHosts: ["www.marxists.org", "web.archive.org"],
  maxBytes: 1000,
  timeoutMs: 1000,
  maxRedirects: 3,
};

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "not-an-ip",
  ])("blocks %s", (ip) => expect(isBlockedAddress(ip)).toBe(true));
  it.each(["8.8.8.8", "172.32.0.1", "207.148.0.1", "2606:4700::1111"])("allows %s", (ip) =>
    expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe("checkUrl", () => {
  it.each([
    ["http://www.marxists.org/a.htm", "only https"],
    ["file:///etc/passwd", "only https"],
    ["ftp://www.marxists.org/", "only https"],
    ["gopher://www.marxists.org/", "only https"],
    ["https://evil.example/a.htm", "not on the source allowlist"],
    ["https://127.0.0.1/", "IP-address URLs"],
    ["https://[::1]/", "IP-address URLs"],
    ["https://user:pw@www.marxists.org/", "credentials"],
    ["https://www.marxists.org:8443/", "non-standard port"],
    ["not a url", "not a valid URL"],
  ])("refuses %s", (url, message) => {
    expect(() => checkUrl(url, policy)).toThrow(message);
  });
  it("accepts allowlisted https URLs", () => {
    expect(checkUrl("https://www.marxists.org/archive/x.htm", policy).hostname).toBe(
      "www.marxists.org",
    );
  });
});

describe("guardedLookup", () => {
  const fake = (address: string) =>
    ((
      _h: string,
      _o: unknown,
      cb: (e: Error | null, a: { address: string; family: number }[]) => void,
    ) => cb(null, [{ address, family: address.includes(":") ? 6 : 4 }])) as never;

  it("refuses host names that resolve to private addresses (DNS rebinding)", async () => {
    const error = await new Promise<Error | null>((resolve) =>
      guardedLookup(fake("10.0.0.5"))("www.marxists.org", {}, (e) => resolve(e)),
    );
    expect(error).toBeInstanceOf(FetchRefused);
  });

  it("passes public addresses through", async () => {
    const address = await new Promise<string>((resolve) =>
      guardedLookup(fake("207.148.0.1"))("www.marxists.org", {}, (_e, a) => resolve(a as string)),
    );
    expect(address).toBe("207.148.0.1");
  });
});

describe("safeFetch", () => {
  const transport =
    (responses: Record<string, { status: number; location?: string; body?: string }>): Transport =>
    async (url) => {
      const r = responses[url.href];
      if (!r) throw new Error(`unexpected request ${url.href}`);
      return {
        status: r.status,
        headers: { location: r.location },
        body: new TextEncoder().encode(r.body ?? ""),
      };
    };

  it("follows redirects that stay on allowlisted https hosts", async () => {
    const result = await safeFetch(
      "https://web.archive.org/web/20261003id_/https://www.marxists.org/a.htm",
      policy,
      transport({
        "https://web.archive.org/web/20261003id_/https://www.marxists.org/a.htm": {
          status: 302,
          location: "/web/20251231110124id_/https://www.marxists.org/a.htm",
        },
        "https://web.archive.org/web/20251231110124id_/https://www.marxists.org/a.htm": {
          status: 200,
          body: "<html>",
        },
      }),
    );
    expect(result.url).toBe(
      "https://web.archive.org/web/20251231110124id_/https://www.marxists.org/a.htm",
    );
  });

  it("re-validates every redirect hop", async () => {
    await expect(
      safeFetch(
        "https://www.marxists.org/a.htm",
        policy,
        transport({
          "https://www.marxists.org/a.htm": {
            status: 301,
            location: "http://169.254.169.254/latest/meta-data",
          },
        }),
      ),
    ).rejects.toThrow("only https");
    await expect(
      safeFetch(
        "https://www.marxists.org/a.htm",
        policy,
        transport({
          "https://www.marxists.org/a.htm": { status: 301, location: "https://internal.example/" },
        }),
      ),
    ).rejects.toThrow("not on the source allowlist");
  });

  it("stops redirect loops", async () => {
    await expect(
      safeFetch(
        "https://www.marxists.org/a.htm",
        policy,
        transport({ "https://www.marxists.org/a.htm": { status: 302, location: "/a.htm" } }),
      ),
    ).rejects.toThrow("more than 3 redirects");
  });

  it("refuses non-200 responses", async () => {
    await expect(
      safeFetch(
        "https://www.marxists.org/a.htm",
        policy,
        transport({ "https://www.marxists.org/a.htm": { status: 404 } }),
      ),
    ).rejects.toThrow("HTTP 404");
  });
});

describe("Wayback helpers", () => {
  it("builds raw-mode URLs and recognises snapshots of the right page", () => {
    const url = "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm";
    expect(waybackRawUrl(url, new Date("2026-10-03T00:00:00Z"))).toBe(
      `https://web.archive.org/web/20261003id_/${url}`,
    );
    expect(isWaybackSnapshotOf(`https://web.archive.org/web/20251231110124id_/${url}`, url)).toBe(
      true,
    );
    expect(
      isWaybackSnapshotOf(
        `https://web.archive.org/web/20251231110124id_/http://www.marxists.org:80/archive/marx/works/1848/communist-manifesto/ch01.htm`,
        url,
      ),
    ).toBe(true);
    expect(isWaybackSnapshotOf(`https://web.archive.org/web/20251231110124/${url}`, url)).toBe(
      false,
    );
    expect(
      isWaybackSnapshotOf(
        `https://web.archive.org/web/20251231110124id_/https://www.marxists.org/other.htm`,
        url,
      ),
    ).toBe(false);
  });
});

describe("decodeHtml", () => {
  it("decodes declared ISO-8859-1 as windows-1252 (curly quotes, pound sign)", () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('<meta charset="iso-8859-1">'),
      0x93,
      0x41,
      0x94,
      0xa3,
    ]);
    expect(decodeHtml(bytes).endsWith("“A”£")).toBe(true);
  });
  it("decodes declared UTF-8", () => {
    expect(decodeHtml(new TextEncoder().encode('<meta charset="utf-8">½'))).toContain("½");
  });
});
