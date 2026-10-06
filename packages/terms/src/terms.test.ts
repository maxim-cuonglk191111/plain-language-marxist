import type { TermFile } from "@plm/schema";
import { describe, expect, it } from "vitest";
import {
  checkTokens,
  parseTokens,
  renderTokens,
  resolveChoice,
  resolveSense,
  scopeBadge,
  usageCounts,
} from "./index.ts";

const bourgeoisie: TermFile = {
  schema_version: 5,
  term: "bourgeoisie",
  original: { sg: "bourgeoisie", adj: "bourgeois" },
  definition: { short: "The class of modern capitalists." },
  renderings: {
    "capitalist-class": {
      forms: { sg: "capitalist class", adj: "capitalist" },
      reason: "Clear today.",
    },
    "bourgeois-class": {
      forms: { sg: "bourgeois class", adj: "bourgeois" },
      reason: "Closer to the source.",
    },
  },
  default: "capitalist-class",
  scoped_defaults: [
    { scope: "work:engels:1880:socialism-utopian-scientific", rendering: "bourgeois-class" },
    { scope: "author:lenin", rendering: "bourgeois-class" },
  ],
};
const vocab = new Map([["bourgeoisie", bourgeoisie]]);

describe("parseTokens", () => {
  it("parses every token form", () => {
    const result = parseTokens(
      "The {Bourgeoisie} and {bourgeoisie:adj} {bourgeoisie=bourgeois-class} \\{x}",
    );
    expect(result.ok && result.segments).toEqual([
      { kind: "text", value: "The " },
      {
        kind: "term",
        term: "bourgeoisie",
        form: "sg",
        capitalize: true,
        raw: "{Bourgeoisie}",
        offset: 4,
      },
      { kind: "text", value: " and " },
      {
        kind: "term",
        term: "bourgeoisie",
        form: "adj",
        capitalize: false,
        raw: "{bourgeoisie:adj}",
        offset: 22,
      },
      { kind: "text", value: " " },
      {
        kind: "term",
        term: "bourgeoisie",
        form: "sg",
        capitalize: false,
        pin: "bourgeois-class",
        raw: "{bourgeoisie=bourgeois-class}",
        offset: 40,
      },
      { kind: "text", value: " {x}" },
    ]);
  });

  it.each([
    ["an {open token", 'unclosed "{"'],
    ["{Two Words}", "malformed term token {Two Words}"],
    ["{bourgeoisie:Adj}", "malformed term token"],
    ["{}", "malformed term token {}"],
  ])("rejects %s", (text, message) => {
    const result = parseTokens(text);
    expect(!result.ok && result.error.message).toContain(message);
  });
});

describe("resolveChoice", () => {
  it("follows pin → preference → work → author → default", () => {
    expect(resolveChoice(bourgeoisie, {})).toBe("capitalist-class");
    expect(resolveChoice(bourgeoisie, { authors: ["lenin"] })).toBe("bourgeois-class");
    expect(
      resolveChoice(bourgeoisie, { workId: "work:engels:1880:socialism-utopian-scientific" }),
    ).toBe("bourgeois-class");
    expect(resolveChoice(bourgeoisie, { preferAll: "original", authors: ["lenin"] })).toBe(
      "original",
    );
    expect(
      resolveChoice(bourgeoisie, {
        preferences: { bourgeoisie: "bourgeois-class" },
        preferAll: "original",
      }),
    ).toBe("bourgeois-class");
    expect(resolveChoice(bourgeoisie, { preferAll: "original" }, "capitalist-class")).toBe(
      "capitalist-class",
    );
  });

  it("ignores preferences that name no rendering", () => {
    expect(resolveChoice(bourgeoisie, { preferences: { bourgeoisie: "ruling-class" } })).toBe(
      "capitalist-class",
    );
  });
});

describe("renderTokens", () => {
  it("resolves forms, capitalization and reader preference without touching other text", () => {
    const text = "{Bourgeoisie} rule; a {bourgeoisie:adj} <i>society</i>.";
    expect(renderTokens(text, vocab)).toEqual({
      ok: true,
      text: "Capitalist class rule; a capitalist <i>society</i>.",
    });
    expect(renderTokens(text, vocab, { preferAll: "original" })).toEqual({
      ok: true,
      text: "Bourgeoisie rule; a bourgeois <i>society</i>.",
    });
  });

  it("fails on unknown terms or forms", () => {
    expect(renderTokens("{proletariat}", vocab)).toEqual({
      ok: false,
      error: "unknown term {proletariat}",
    });
    expect(renderTokens("{bourgeoisie:pl}", vocab)).toEqual({
      ok: false,
      error: 'term bourgeoisie has no form "pl"',
    });
  });
});

describe("checkTokens", () => {
  it("reports unknown terms, undeclared forms and bad pins with offsets", () => {
    const issues = checkTokens(
      "x {proletariat} {bourgeoisie:pl} {bourgeoisie=ruling-class}",
      vocab,
    );
    expect(issues.map((i) => i.offset)).toEqual([2, 16, 33]);
    expect(issues[0]?.message).toContain("unknown term {proletariat}");
    expect(issues[1]?.message).toContain('no form "pl" (declared: sg, adj)');
    expect(issues[2]?.message).toContain('no rendering "ruling-class"');
  });
});

describe("usageCounts", () => {
  it("counts the rendering each token shows by default", () => {
    const counts = usageCounts(
      [
        { text: "{bourgeoisie} and {Bourgeoisie}" },
        { text: "{bourgeoisie}", authors: ["lenin"] },
        { text: "{bourgeoisie=bourgeois-class}" },
      ],
      vocab,
    );
    expect(Object.fromEntries(counts.get("bourgeoisie") ?? [])).toEqual({
      "capitalist-class": 2,
      "bourgeois-class": 2,
    });
  });
});

describe("scopeBadge", () => {
  it("generates correct labels and kinds for scopes", () => {
    expect(scopeBadge("work:marx:1848:communist-manifesto")).toEqual({
      label: "Communist Manifesto (1848)",
      kind: "work",
    });
    expect(scopeBadge("author:lenin")).toEqual({
      label: "In Lenin",
      kind: "author",
    });
    expect(scopeBadge("period:1844-1848")).toEqual({
      label: "1844–1848",
      kind: "period",
    });
    expect(scopeBadge("movement:council-communism")).toEqual({
      label: "Council Communism",
      kind: "movement",
    });
    expect(scopeBadge("unknown")).toEqual({
      label: "General definition",
      kind: "general",
    });
  });
});

describe("resolveSense", () => {
  const partyTerm = {
    definition: { short: "A political current or organisation." },
    senses: [
      {
        scope: "work:marx:1848:communist-manifesto",
        short: "A broad class movement, not a rigid cadre party.",
      },
      {
        scope: "author:lenin",
        short: "The disciplined vanguard organisation of professional revolutionaries.",
      },
      {
        scope: "period:1918-1923",
        short: "Revolutionary workers council movement period.",
      },
      {
        scope: "movement:council-communism",
        short: "A bourgeois organ of representation replaced by workers councils.",
      },
    ],
  };

  it("prioritizes work scope first", () => {
    const res = resolveSense(partyTerm, {
      workId: "work:marx:1848:communist-manifesto",
      authors: ["lenin"],
      year: 1920,
      movement: "council-communism",
    });
    expect(res.current.short).toBe("A broad class movement, not a rigid cadre party.");
    expect(res.current.badge.label).toBe("Communist Manifesto (1848)");
    expect(res.current.isScoped).toBe(true);
    expect(res.others).toHaveLength(3);
  });

  it("prioritizes author scope second", () => {
    const res = resolveSense(partyTerm, {
      authors: ["lenin"],
      year: 1920,
      movement: "council-communism",
    });
    expect(res.current.short).toBe(
      "The disciplined vanguard organisation of professional revolutionaries.",
    );
    expect(res.current.badge.label).toBe("In Lenin");
    expect(res.others).toHaveLength(3);
  });

  it("prioritizes period scope third", () => {
    const res = resolveSense(partyTerm, {
      year: 1920,
      movement: "council-communism",
    });
    expect(res.current.short).toBe("Revolutionary workers council movement period.");
    expect(res.current.badge.label).toBe("1918–1923");
    expect(res.others).toHaveLength(3);
  });

  it("prioritizes movement scope fourth", () => {
    const res = resolveSense(partyTerm, {
      movement: "council-communism",
    });
    expect(res.current.short).toBe(
      "A bourgeois organ of representation replaced by workers councils.",
    );
    expect(res.current.badge.label).toBe("Council Communism");
    expect(res.others).toHaveLength(3);
  });

  it("falls back to general definition when no scope matches", () => {
    const res = resolveSense(partyTerm, {
      workId: "work:other:1890:other-work",
      authors: ["other-author"],
      year: 1890,
    });
    expect(res.current.short).toBe("A political current or organisation.");
    expect(res.current.badge.label).toBe("General definition");
    expect(res.current.isScoped).toBe(false);
    expect(res.others).toHaveLength(4);
  });

  it("returns general definition if term has no senses", () => {
    const res = resolveSense(
      { definition: { short: "A baseline definition." } },
      {
        workId: "work:marx:1848:communist-manifesto",
      },
    );
    expect(res.current.short).toBe("A baseline definition.");
    expect(res.current.isScoped).toBe(false);
    expect(res.others).toHaveLength(0);
  });
});
