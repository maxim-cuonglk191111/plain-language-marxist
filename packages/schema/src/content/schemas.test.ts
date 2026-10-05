import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import { CONTENT_SCHEMAS } from "../index.ts";

const fixture = (name: string): Record<string, unknown> =>
  parseYaml(
    readFileSync(new URL(`../../fixtures/valid/${name}`, import.meta.url), "utf8"),
  ) as Record<string, unknown>;

const FIXTURES: Record<keyof typeof CONTENT_SCHEMAS, string> = {
  work: "work.yml",
  source: "source.yml",
  rendering: "en-plain.yml",
  "original-terms": "original-terms.yml",
  explanations: "explanations.yml",
  crossrefs: "crossrefs.yml",
  term: "term.yml",
  collection: "collection.yml",
  governance: "governance.yml",
};

/** Messages of all issues, prefixed with their path, for readable assertions. */
function issues(schema: z.ZodType, data: unknown): string[] {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("valid fixtures", () => {
  it.each(Object.entries(FIXTURES))("%s fixture parses", (name, file) => {
    expect(issues(CONTENT_SCHEMAS[name as keyof typeof CONTENT_SCHEMAS], fixture(file))).toEqual(
      [],
    );
  });
});

type Case = [description: string, mutate: (d: any) => void, expected: string]; // eslint-disable-line @typescript-eslint/no-explicit-any

const INVALID: Record<keyof typeof CONTENT_SCHEMAS, Case[]> = {
  work: [
    ["unknown schema_version", (d) => (d.schema_version = 99), "schema_version:"],
    ["unknown key (typo)", (d) => (d.titel = "x"), 'Unrecognized key: "titel"'],
    [
      "verified rights without verifier",
      (d) => delete d.rights.verified_by,
      "rights.verified_by: required once rights are verified",
    ],
    [
      "CC license without version",
      (d) => (d.rights.status = "CC_BY_SA"),
      "rights.license: name the exact license version",
    ],
    [
      "permission without record",
      (d) => (d.rights.status = "PERMISSION_GRANTED"),
      "rights.permission:",
    ],
    ["unknown rights status", (d) => (d.rights.status = "UNKNOWN"), "rights.status:"],
    [
      "duplicate document",
      (d) => d.documents.push("ch01"),
      'documents.4: duplicate document "ch01"',
    ],
    [
      "malformed id",
      (d) => (d.id = "marx-manifesto"),
      "id: must look like work:{author}:{year}:{slug}",
    ],
  ],
  source: [
    [
      "duplicate passage id",
      (d) => (d.passages[1].id = "p00001"),
      'passages.1: duplicate passage id "p00001"',
    ],
    [
      "ordinal-looking id with suffix",
      (d) => (d.passages[1].id = "p00002a"),
      "passages.1.id: must look like p00017",
    ],
    [
      "layout markup error",
      (d) => (d.passages[1].text = "a <span>b</span>"),
      "passages.1.text: layout markup: tag <span> is not allowed (at character 2)",
    ],
    [
      "level on a paragraph",
      (d) => (d.passages[1].level = 2),
      "passages.1.level: level is only allowed on headings",
    ],
    [
      "footnote without label",
      (d) => delete d.passages[2].label,
      "passages.2.label: footnotes need a label",
    ],
    [
      "duplicate footnote label",
      (d) => (d.passages[3].label = "1"),
      'passages.3.label: duplicate footnote label "1"',
    ],
    [
      "empty active passage",
      (d) => (d.passages[1].text = "  "),
      "passages.1.text: active passages need text",
    ],
    [
      "http source url",
      (d) => (d.source.url = "http://www.marxists.org/x.htm"),
      "source.url: must be an https:// URL",
    ],
    [
      "bad hash",
      (d) => (d.passages[0].hash = "md5:abc"),
      "passages.0.hash: must be sha256:<64 hex chars>",
    ],
  ],
  rendering: [
    [
      "key differs from first covered passage",
      (d) => (d.renderings.p00002.covers = ["p00003"]),
      "renderings.p00002.covers: the key must be the first covered passage",
    ],
    [
      "duplicate covered passage",
      (d) => (d.renderings.p00002.covers = ["p00002", "p00002"]),
      'renderings.p00002.covers.1: duplicate covered passage "p00002"',
    ],
    [
      "empty text",
      (d) => (d.renderings.p00002.text = "\n"),
      "renderings.p00002.text: rendering text must not be empty",
    ],
    ["revision 0", (d) => (d.renderings.p00002.revision = 0), "renderings.p00002.revision:"],
    [
      "missing ai_assisted",
      (d) => delete d.renderings.p00002.ai_assisted,
      "renderings.p00002.ai_assisted:",
    ],
    ["bad language", (d) => (d.language = "English"), "language: must be an ISO 639 code like en"],
  ],
  "original-terms": [
    ["occurrence 0", (d) => (d.annotations[0].occurrence = 0), "annotations.0.occurrence:"],
    ["empty match", (d) => (d.annotations[0].match = ""), "annotations.0.match:"],
  ],
  explanations: [
    ["unknown kind", (d) => (d.explanations.e001.kind = "opinion"), "explanations.e001.kind:"],
    ["no targets", (d) => (d.explanations.e001.targets = []), "explanations.e001.targets:"],
    [
      "bad key",
      (d) => (d.explanations.x1 = d.explanations.e001),
      "explanations.x1: Invalid key in record",
    ],
  ],
  crossrefs: [
    ["unknown kind", (d) => (d.crossrefs[0].kind = "contradicts"), "crossrefs.0.kind:"],
    ["from not a passage id", (d) => (d.crossrefs[0].from = "17"), "crossrefs.0.from:"],
    [
      "to without a passage",
      (d) => (d.crossrefs[0].to = "document:marx:1848:communist-manifesto:ch01"),
      "crossrefs.0.to: must look like document:{author}:{year}:{slug}:{doc}#p00017",
    ],
    [
      "self-link",
      (d) => (d.crossrefs[0].to = `${d.document}#${d.crossrefs[0].from}`),
      "crossrefs.0.to: p00002 cannot refer to itself",
    ],
    [
      "duplicate",
      (d) => d.crossrefs.push({ ...d.crossrefs[0], kind: "quotes" }),
      "crossrefs.2: duplicate cross-reference from p00002",
    ],
    ["empty list", (d) => (d.crossrefs = []), "crossrefs:"],
    ["empty note", (d) => (d.crossrefs[0].note = ""), "crossrefs.0.note:"],
    ["unknown key", (d) => (d.crossrefs[0].why = "x"), "Unrecognized key"],
  ],
  term: [
    [
      "rendering missing a declared form",
      (d) => delete d.renderings["capitalist-class"].forms.adj,
      "renderings.capitalist-class.forms: forms must match the declared forms [adj, sg]; missing adj",
    ],
    [
      "rendering with undeclared form",
      (d) => (d.renderings.bourgeoisie.forms.pl = "bourgeoisies"),
      "renderings.bourgeoisie.forms: forms must match the declared forms [adj, sg]; undeclared pl",
    ],
    [
      "default not a rendering",
      (d) => (d.default = "ruling-class"),
      'default: "ruling-class" is not one of the renderings',
    ],
    [
      "scoped default not a rendering",
      (d) => (d.scoped_defaults[0].rendering = "x"),
      'scoped_defaults.0.rendering: "x" is not one of the renderings',
    ],
    ["bad scope", (d) => (d.scoped_defaults[0].scope = "marx"), "scoped_defaults.0.scope:"],
  ],
  collection: [
    ["unknown kind", (d) => (d.kind = "playlist"), "kind:"],
    ["reading path without rationale", (d) => delete d.rationale, "rationale:"],
  ],
  governance: [
    ["missing rule for a type", (d) => delete d.rules.NEW_WORK, "rules.NEW_WORK:"],
    [
      "reviewer also maintainer",
      (d) => (d.reviewers = ["CuongLKHE191111"]),
      "reviewers.1: duplicate handle",
    ],
    [
      "unknown role",
      (d) => (d.rules.RENDERING.any_of[0].role = "admin"),
      "rules.RENDERING.any_of.0.role:",
    ],
    [
      "handle with @",
      (d) => (d.maintainers = ["@someone"]),
      "maintainers.0: must be a GitHub username without @",
    ],
  ],
};

describe("invalid fixtures", () => {
  for (const [name, cases] of Object.entries(INVALID)) {
    describe(name, () => {
      it.each(cases)("rejects: %s", (_, mutate, expected) => {
        const data = structuredClone(fixture(FIXTURES[name as keyof typeof CONTENT_SCHEMAS]));
        mutate(data);
        const found = issues(CONTENT_SCHEMAS[name as keyof typeof CONTENT_SCHEMAS], data);
        expect(
          found.some((m) => m.startsWith(expected) || m.includes(expected)),
          found.join("\n"),
        ).toBe(true);
      });
    });
  }
});
