// windows-1252 code points for bytes 0x80–0x9F (0 = unassigned, kept as the byte value).
// Node's TextDecoder("windows-1252") decodes these as Latin-1 control characters,
// so the table is applied by hand.
const CP1252_HIGH = [
  0x20ac, 0, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0, 0x017d, 0, 0, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161,
  0x203a, 0x0153, 0, 0x017e, 0x0178,
];

export function decodeWindows1252(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    const mapped = byte >= 0x80 && byte <= 0x9f ? CP1252_HIGH[byte - 0x80] || byte : byte;
    out += String.fromCharCode(mapped);
  }
  return out;
}

/**
 * Decodes HTML bytes using the charset the page declares. ISO-8859-1 is
 * decoded as windows-1252, as browsers do, because MIA pages contain cp1252
 * punctuation bytes.
 */
export function decodeHtml(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  const head = decodeWindows1252(bytes.slice(0, 2048));
  const declared = /charset\s*=\s*["']?([a-z0-9_-]+)/i.exec(head)?.[1]?.toLowerCase();
  if (declared === "utf-8" || declared === "utf8") return new TextDecoder("utf-8").decode(bytes);
  return decodeWindows1252(bytes);
}
