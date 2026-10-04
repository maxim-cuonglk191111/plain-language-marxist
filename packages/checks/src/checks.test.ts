import { readFileSync } from "node:fs";
import type { TermFile } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { parseExchange, serializeExchange } from "./exchange.ts";
import { buildPrompt, extractCoreRules, extractTemplate } from "./prompt.ts";
import { findHardWords, parseHardWords } from "./hard-words.ts";
import { checkRenderings, type SourcePassage } from "./rendering.ts";

const bourgeoisie: TermFile = {
  schema_version: 2,
  term: "bourgeoisie",
  original: { sg: "bourgeoisie", adj: "bourgeois" },
  definition: { short: "x" },
  renderings: {
    "capitalist-class": { forms: { sg: "capitalist class", adj: "capitalist" }, reason: "x" },
    bourgeoisie: { forms: { sg: "bourgeoisie", adj: "bourgeois" }, reason: "x" },
  },
  default: "capitalist-class",
};
const vocabulary = new Map([["bourgeoisie", bourgeoisie]]);

// Manifesto Ch. I, as transcribed by MIA.
const passages: SourcePassage[] = [
  {
    id: "p00017",
    state: "active",
    text: "From the serfs of the Middle Ages sprang the chartered burghers of the earliest towns. From these burgesses the first elements of the bourgeoisie were developed.",
  },
  { id: "p00018", state: "tombstoned", text: "Removed." },
  {
    id: "p00019",
    state: "active",
    text: "The executive of the modern state is but a committee for managing the common affairs of the whole bourgeoisie.",
  },
  {
    id: "p00020",
    state: "active",
    text: "Where is the party in opposition that has not been decried as communistic by its opponents in power? In 1848, not 1948.",
  },
];
const ctx = { passages, vocabulary, termWords: ["burghers", "bourgeoisie"] };
const codes = (text: string) => {
  const parsed = parseExchange(text);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return checkRenderings(parsed.entries, ctx).map((f) => `${f.level} ${f.code}`);
};

describe("parseExchange", () => {
  it("parses headers, multi-passage coverage and multi-paragraph text", () => {
    const result = parseExchange(
      "=== p00017\nFirst.\n\nSecond paragraph.\n=== p00019 p00020\nTogether.\n",
    );
    expect(result).toEqual({
      ok: true,
      entries: [
        { covers: ["p00017"], text: "First.\n\nSecond paragraph." },
        { covers: ["p00019", "p00020"], text: "Together." },
      ],
    });
  });

  it("strips a code fence around the whole answer", () => {
    const result = parseExchange("```text\n=== p00017\nText.\n```\n");
    expect(result.ok && result.entries).toEqual([{ covers: ["p00017"], text: "Text." }]);
  });

  it.each([
    ["Here is your text:\n=== p00017\nx", 'text before the first "=== p…" header'],
    ["=== paragraph 6\nx", "must list passage IDs like p00017"],
    ["just prose", 'text before the first "=== p…" header'],
    ["", 'no "=== p…" headers found'],
  ])("rejects %j", (input, message) => {
    const result = parseExchange(input);
    expect(!result.ok && result.error.message).toContain(message);
  });

  it("round-trips through serializeExchange", () => {
    const entries = [{ covers: ["p00017", "p00019"], text: "A.\n\nB." }];
    const result = parseExchange(serializeExchange(entries));
    expect(result.ok && result.entries).toEqual(entries);
  });
});

describe("checkRenderings: errors", () => {
  it.each([
    ["=== p00099\nx", "error unknown-passage"],
    ["=== p00018\nx", "error tombstoned-passage"],
    ["=== p00017\nx\n=== p00017\ny", "error duplicate-passage"],
    ["=== p00019 p00017\nx", "error not-contiguous"],
    ["=== p00017\n", "error empty"],
    ["=== p00017\na <span>b</span>", "error markup"],
    ["=== p00017\nthe {proletariat}", "error token"],
  ])("%j → %s", (input, expected) => {
    expect(codes(input)).toContain(expected);
  });

  it("treats tombstoned passages as invisible for contiguity", () => {
    expect(
      codes(
        "=== p00017 p00019\nFrom the serfs came the burghers; the executive is a committee of the whole {bourgeoisie}.",
      ),
    ).not.toContain("error not-contiguous");
  });
});

describe("checkRenderings: warnings", () => {
  it("passes a faithful rendering cleanly", () => {
    expect(
      codes(
        "=== p00019\nThe executive of the modern state is nothing more than a committee for managing the common affairs of the whole {bourgeoisie}.",
      ),
    ).toEqual([]);
  });

  it.each([
    [
      "changed number",
      "=== p00020\nWhich opposition party has not been called communist by those in power? In 1848, not 1958.",
      "warning numbers",
    ],
    [
      "lost negation",
      "=== p00020\nWhich opposition party has been called communist by those in power? In 1848, 1948.",
      "warning logic-words",
    ],
    [
      "question became a statement",
      "=== p00020\nEvery opposition party has been called communist. In 1848, not 1948.",
      "warning question",
    ],
    [
      "a sentence too long for readers learning English",
      "=== p00017\nFrom the serfs of the Middle Ages came the chartered burghers of the earliest towns, and from these burghers, who lived in the towns and held their charters, the first elements of the {bourgeoisie} slowly developed over many long years.",
      "warning long-sentence",
    ],
    [
      "missing name",
      "=== p00017\nFrom the serfs of the medieval period came the chartered burghers of the first towns. From them came the first elements of the {bourgeoisie}.",
      "warning names",
    ],
  ])("%s", (_, input, expected) => {
    expect(codes(input)).toContain(expected);
  });

  it("compares capitalized tokens capitalized, so {Bourgeoisie} counts as the name Bourgeoisie", () => {
    const local = {
      passages: [
        {
          id: "p00001",
          state: "active" as const,
          text: "two great classes directly facing each other: Bourgeoisie and Proletariat.",
        },
      ],
      vocabulary,
    };
    const parsed = parseExchange(
      "=== p00001\ntwo great classes facing each other: {Bourgeoisie} and Proletariat.",
    );
    if (!parsed.ok) throw new Error(parsed.error.message);
    expect(checkRenderings(parsed.entries, local).map((f) => f.code)).not.toContain("names");
  });

  it("does not mistake a dash that restructures the original for a gloss", () => {
    const local = {
      passages: [
        {
          id: "p00001",
          state: "active" as const,
          text: "lord and serf, guild-master and journeyman, in a word, oppressor and oppressed, stood in opposition",
        },
      ],
      vocabulary,
      termWords: ["journeyman"],
    };
    const parsed = parseExchange(
      "=== p00001\nlord and serf, guild-master and journeyman — in a word, oppressor and oppressed — stood in opposition",
    );
    if (!parsed.ok) throw new Error(parsed.error.message);
    expect(checkRenderings(parsed.entries, local).map((f) => f.code)).not.toContain("gloss");
  });

  // Regression fixture: an earlier AI draft of Ch. I (task 005, counter-example A).
  it("flags the over-explaining AI draft of paragraph 6", () => {
    const draft = `=== p00017
The modern capitalist class did not appear out of nowhere.

It developed gradually from the towns of medieval Europe. Some people who had originally been serfs eventually became burghers—town residents who gained special legal rights and became involved in trade and crafts. Over time, some of these urban groups developed into what Marx and Engels call the bourgeoisie.`;
    const found = codes(draft);
    expect(found).toContain("warning length");
    expect(found).toContain("warning distancing");
    expect(found).toContain("warning gloss");
  });

  it("flags the softened, disclaimed AI draft of paragraph 15", () => {
    const draft = `=== p00019
Marx and Engels make a much stronger claim here.

They argue that the modern state, despite appearing to represent society as a whole, ultimately serves the common interests of the capitalist class.

In other words, governments manage the political conditions that allow the capitalist system to continue.`;
    const found = codes(draft);
    expect(found).toEqual(
      expect.arrayContaining(["warning length", "warning distancing", "warning framing"]),
    );
  });
});

describe("prompt", () => {
  const repo = new URL("../../../", import.meta.url);
  const style = readFileSync(new URL("docs/editorial/STYLE.md", repo), "utf8");
  const promptDoc = readFileSync(new URL("docs/editorial/llm-prompt.md", repo), "utf8");

  it("embeds the style guide's core rules verbatim and fills every placeholder", () => {
    const rules = extractCoreRules(style);
    expect(rules.startsWith("1. Modernize vocabulary and syntax.")).toBe(true);
    const prompt = buildPrompt({
      template: extractTemplate(promptDoc),
      coreRules: rules,
      work: "Manifesto of the Communist Party (Marx and Engels, 1848; translated by Samuel Moore, 1888)",
      terms: [bourgeoisie],
      passages: [passages[0] as SourcePassage],
    });
    expect(prompt).toContain(rules);
    expect(prompt).toContain('{bourgeoisie} for "bourgeoisie", {bourgeoisie:adj} for "bourgeois"');
    expect(prompt).toContain("=== p00017\nFrom the serfs of the Middle Ages");
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(prompt).not.toContain("---8<---");
  });
});

describe("hard words", () => {
  const hardWords = [
    { match: "yoke", use: "rule" },
    { match: "in the face of", use: "faced with" },
  ];
  const withList = (text: string) => {
    const parsed = parseExchange(text);
    if (!parsed.ok) throw new Error(parsed.error.message);
    return checkRenderings(parsed.entries, { ...ctx, hardWords });
  };

  it("warns on listed words and phrases, whole words only, ignoring case", () => {
    const found = withList(
      "=== p00019\nUnder the Yoke of the nobility, in the face of everything, the government of the modern state is only a committee for managing the common affairs of the whole {bourgeoisie}.",
    ).filter((f) => f.code === "hard-word");
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('"yoke" (use rule)');
    expect(found[0]?.message).toContain('"in the face of" (use faced with)');
  });

  it("does not match inside other words", () => {
    expect(findHardWords("the yokes of oxen, a yoked team", hardWords)).toEqual([]);
  });

  it("reads the YAML list shape and rejects broken entries", () => {
    expect(parseHardWords([{ match: " nay ", use: "what is more" }])).toEqual([
      { match: "nay", use: "what is more" },
    ]);
    expect(() => parseHardWords([{ match: "", use: "x" }])).toThrow(/entry 1/);
    expect(() => parseHardWords({})).toThrow(/list/);
  });
});
