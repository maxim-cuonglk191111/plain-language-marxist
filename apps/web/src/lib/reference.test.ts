import { describe, expect, it } from "vitest";
import { chapterNumber, formatRange, formatRef, parseRef, type RefWork } from "./reference";

const W = "/archive/marx/works/1848/communist-manifesto/";
const manifesto: RefWork = {
  short: "Manifesto",
  title: "Manifesto of the Communist Party",
  chapters: [
    { path: `${W}ch01.htm`, numeral: "I", passages: 65 },
    { path: `${W}ch02.htm`, numeral: "II", passages: 76 },
    { path: `${W}ch03.htm`, numeral: "III", passages: 69 },
    { path: `${W}ch04.htm`, numeral: "IV", passages: 14 },
  ],
};
const other: RefWork = {
  short: "Wage Labour",
  title: "Wage Labour and Capital",
  chapters: [{ path: "/w/ch1.htm", numeral: "1", passages: 9 }],
};
const go = (path: string, passage: string | null, label: string) => ({
  ok: true,
  path,
  passage,
  label,
});

describe("formatting", () => {
  it("writes references and ranges", () => {
    expect(formatRef("Manifesto II", "p00017")).toBe("Manifesto II.17");
    expect(formatRange("Manifesto I", ["p00015", "p00013", "p00014"])).toBe("Manifesto I.13–15");
    expect(formatRange("Manifesto I", ["p00013", "p00020"])).toBe("Manifesto I.13 and 1 more");
  });

  it("reads Roman and Arabic chapter numbers", () => {
    expect([chapterNumber("IV"), chapterNumber("ix"), chapterNumber("12")]).toEqual([4, 9, 12]);
    expect(chapterNumber("word")).toBeNaN();
  });
});

describe("parseRef", () => {
  const works = [manifesto];
  it.each([
    ["II.17", `${W}ch02.htm`, "p00017", "Manifesto II.17"],
    ["Manifesto 2.17", `${W}ch02.htm`, "p00017", "Manifesto II.17"],
    ["manifesto ii 17", `${W}ch02.htm`, "p00017", "Manifesto II.17"],
    ["ch2 17", `${W}ch02.htm`, "p00017", "Manifesto II.17"],
    ["Chapter 4, 3", `${W}ch04.htm`, "p00003", "Manifesto IV.3"],
    ["4:3", `${W}ch04.htm`, "p00003", "Manifesto IV.3"],
    ["I.2", `${W}ch01.htm`, "p00002", "Manifesto I.2"],
  ])("“%s” → the passage", (input, path, passage, label) => {
    expect(parseRef(input, works)).toEqual(go(path, passage, label));
  });

  it("goes to the top of a chapter when no passage is given", () => {
    expect(parseRef("chapter 3", works)).toEqual(go(`${W}ch03.htm`, null, "Manifesto III"));
    expect(parseRef("Manifesto IV", works)).toEqual(go(`${W}ch04.htm`, null, "Manifesto IV"));
  });

  it("leaves ordinary search words alone", () => {
    for (const q of ["class struggle", "civil", "mix", "1848", "guild-master", "II"])
      expect(parseRef(q, works)).toBeNull();
  });

  it("explains a reference that points nowhere", () => {
    expect(parseRef("II.99", works)).toEqual({
      ok: false,
      message: "Manifesto II has 76 passages, so there is no passage 99.",
    });
    expect(parseRef("VII.1", works)).toEqual({
      ok: false,
      message: "Manifesto has no chapter VII.",
    });
    expect(parseRef("Manifesto", works)).toEqual({
      ok: false,
      message: "Add a chapter, e.g. “Manifesto II.17”.",
    });
  });

  it("with several works, uses the named or current one, or asks which", () => {
    const both = [manifesto, other];
    expect(parseRef("Wage Labour 1.4", both)).toEqual(
      go("/w/ch1.htm", "p00004", "Wage Labour 1.4"),
    );
    expect(parseRef("II.17", both, manifesto)?.ok).toBe(true);
    expect(parseRef("II.17", both)).toEqual({
      ok: false,
      message: "Say which work, e.g. “Manifesto II.17”.",
    });
  });
});
