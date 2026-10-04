import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { basedOnHash } from "./hash.ts";
import { PATHS, writeFixture, type FixtureData } from "./test-fixture.ts";
import { validate } from "./validate.ts";

const codes = (root: string) => validate(root).map((i) => `${i.severity} ${i.code}`);

describe("validate: the fixture repository", () => {
  it("is clean", () => {
    expect(validate(writeFixture())).toEqual([]);
  });

  it("accepts a term card with an exact example and known related terms", () => {
    const root = writeFixture((d) => {
      d[PATHS.term].example = {
        document: "document:marx:1848:communist-manifesto:ch01",
        passage: "p00005",
        text: "The modern bourgeois  society has not done away", // whitespace is normalised
      };
      d[PATHS.term].not_to_confuse = "Not just people who are well off.";
      d[PATHS.term].related = [];
    });
    expect(validate(root)).toEqual([]);
  });
});

type Case = [name: string, mutate: (d: FixtureData) => void, expected: string];

const CASES: Case[] = [
  // identity and layout
  [
    "work id does not match its directory",
    (d) => (d[PATHS.work].id = "work:marx:1848:manifesto"),
    "error work/id-mismatch",
  ],
  [
    "work year does not match its directory",
    (d) => (d[PATHS.work].year = 1850),
    "error work/year-mismatch",
  ],
  [
    "document listed but missing",
    (d) => d[PATHS.work].documents.push("ch02"),
    "error work/missing-document",
  ],
  [
    "document directory not listed",
    (d) => (d[PATHS.work].documents = ["ch01x"]),
    "error work/unlisted-document",
  ],
  [
    "source document id mismatch",
    (d) => (d[PATHS.source].document = "document:marx:1848:communist-manifesto:ch09"),
    "error document/id-mismatch",
  ],
  // rights
  [
    "rights unverified",
    (d) => (d[PATHS.work].rights = { status: "UNVERIFIED", attribution: "MIA" }),
    "error rights/unverified",
  ],
  [
    "rights blocked is only a warning",
    (d) => (d[PATHS.work].rights.status = "BLOCKED"),
    "warning rights/blocked",
  ],
  // source integrity
  [
    "hand-edited source text",
    (d) => (d[PATHS.source].passages[1].text = "The history of all society is class struggle."),
    "error source/hash-mismatch",
  ],
  [
    "derived_from unknown passage",
    (d) => (d[PATHS.source].passages[4].derived_from = ["p00099"]),
    "error source/unknown-derived-from",
  ],
  [
    "footnote ref without footnote",
    (d) => (d[PATHS.source].passages[5].label = "2"),
    "error footnote/unknown-ref",
  ],
  // renderings
  [
    "covers unknown passage",
    (d) => (d[PATHS.rendering].renderings.p00005.covers = ["p00005", "p00099"]),
    "error rendering/unknown-passage",
  ],
  [
    "covers tombstoned passage",
    (d) => (d[PATHS.rendering].renderings.p00005.covers = ["p00005", "p00004"]),
    "error rendering/tombstoned-passage",
  ],
  [
    "overlapping coverage",
    (d) => (d[PATHS.rendering].renderings.p00005.covers = ["p00005", "p00003"]),
    "error rendering/overlap",
  ],
  [
    "not contiguous",
    (d) => {
      const r = d[PATHS.rendering].renderings;
      r.p00001.covers = ["p00001", "p00005"];
      delete r.p00005;
    },
    "error rendering/not-contiguous",
  ],
  [
    "stale rendering is a warning",
    (d) => (d[PATHS.rendering].renderings.p00001.based_on = `sha256:${"0".repeat(64)}`),
    "warning rendering/stale",
  ],
  [
    "rendering file name mismatch",
    (d) => (d[PATHS.rendering].register = "simple"),
    "error rendering/file-name",
  ],
  [
    "internal link to unknown passage",
    (d) =>
      (d[PATHS.rendering].renderings.p00005.text =
        '<a href="/archive/marx/works/1848/communist-manifesto/ch01.htm#p00042">x</a>'),
    "error link/unknown-passage",
  ],
  [
    "internal link to unknown path",
    (d) =>
      (d[PATHS.rendering].renderings.p00005.text =
        '<a href="/archive/marx/works/1848/x.htm">x</a>'),
    "error link/unknown-path",
  ],
  ["unknown term token", (d) => (d[PATHS.rendering].renderings.p00005.text = "The {proletariat} rises."), "error term/token"],
  ["undeclared term form", (d) => (d[PATHS.rendering].renderings.p00005.text = "The {bourgeoisie:pl}."), "error term/token"],
  // annotations and explanations
  [
    "annotation term without vocabulary file",
    (d) => (d[PATHS.terms].annotations[0].term = "proletariat"),
    "error annotation/unknown-term",
  ],
  [
    "annotation match not found",
    (d) => (d[PATHS.terms].annotations[0].match = "bourgeoisie"),
    "error annotation/no-match",
  ],
  [
    "annotation matching only inside a longer word",
    (d) => (d[PATHS.terms].annotations[0].match = "bourgeoi"),
    "error annotation/no-match",
  ],
  [
    "annotation occurrence too high",
    (d) => (d[PATHS.terms].annotations[0].occurrence = 2),
    "error annotation/no-match",
  ],
  [
    "annotation on tombstoned passage",
    (d) => (d[PATHS.terms].annotations[0].passage = "p00004"),
    "error annotation/unknown-passage",
  ],
  [
    "explanation targets unknown passage",
    (d) => (d[PATHS.explanations].explanations.e001.targets = ["p00099"]),
    "error explanation/unknown-passage",
  ],
  [
    "link to unknown vocabulary term",
    (d) => (d[PATHS.explanations].explanations.e001.text = '<a href="/vocabulary/capital/">c</a>'),
    "error link/unknown-term",
  ],
  // vocabulary and collections
  [
    "scoped default for unknown work",
    (d) =>
      (d[PATHS.term].scoped_defaults = [
        { scope: "work:lenin:1917:state-and-revolution", rendering: "capitalist-class" },
      ]),
    "warning term/unknown-scope",
  ],
  [
    "related term card does not exist",
    (d) => (d[PATHS.term].related = ["mode-of-production"]),
    "error term/unknown-related",
  ],
  [
    "example points at a missing passage",
    (d) =>
      (d[PATHS.term].example = {
        document: "document:marx:1848:communist-manifesto:ch01",
        passage: "p00099",
        text: "The modern bourgeois society",
      }),
    "error term/example-not-found",
  ],
  [
    "example text is not in the passage",
    (d) =>
      (d[PATHS.term].example = {
        document: "document:marx:1848:communist-manifesto:ch01",
        passage: "p00005",
        text: "The modern capitalist society",
      }),
    "error term/example-not-found",
  ],
  [
    "term card sentence too long for newcomers",
    (d) =>
      (d[PATHS.term].definition.short =
        "The class that owns the factories, the land, the machines, the raw materials and the money that is invested in all of these in order to employ others for wages."),
    "warning term/long-sentence",
  ],
  [
    "collection references unknown work",
    (d) => d[PATHS.collection].items.push("work:lenin:1917:state-and-revolution"),
    "error collection/unknown-ref",
  ],
];

describe("validate: invariants", () => {
  it.each(CASES)("%s", (_, mutate, expected) => {
    expect(codes(writeFixture(mutate))).toContain(expected);
  });

  it("skips tombstoned passages when checking contiguity", () => {
    // p00004 is tombstoned, so covers [p00003, p00005] is a contiguous run of active passages.
    const root = writeFixture((d) => {
      const hashOf = (id: string): string =>
        d[PATHS.source].passages.find((p: { id: string }) => p.id === id).hash;
      const r = d[PATHS.rendering].renderings;
      r.p00002 = { ...r.p00002, covers: ["p00002"], based_on: basedOnHash([hashOf("p00002")]) };
      r.p00003 = {
        ...r.p00005,
        covers: ["p00003", "p00005"],
        based_on: basedOnHash(["p00003", "p00005"].map(hashOf)),
      };
      delete r.p00005;
    });
    expect(validate(root)).toEqual([]);
  });
});

describe("validate: file problems carry line numbers", () => {
  it("reports YAML syntax errors with a line", () => {
    const root = writeFixture(undefined, { [PATHS.term]: "schema_version: 2\nterm: [unclosed\n" });
    const issue = validate(root).find((i) => i.file === PATHS.term);
    expect(issue?.message).toMatch(/^YAML:/);
    expect(issue?.line).toBeGreaterThan(0);
  });

  it("reports schema errors at the offending line", () => {
    const root = writeFixture((d) => (d[PATHS.source].passages[2].id = "p3"));
    const issue = validate(root).find((i) => i.code === "schema/invalid");
    expect(issue?.message).toContain("passages.2.id");
    expect(issue?.line).toBeGreaterThan(1);
  });

  it("validates governance.yml when present", () => {
    const ok = writeFixture(undefined, {
      "governance.yml": readFileSync(new URL("../../../governance.yml", import.meta.url), "utf8"),
    });
    expect(validate(ok)).toEqual([]);

    const broken = writeFixture(undefined, {
      "governance.yml":
        "schema_version: 2\nbootstrap_mode: true\nmin_account_age_days: 30\nmaintainers: [a]\nreviewers: []\nrules: {}\n",
    });
    const issue = validate(broken).find((i) => i.file === "governance.yml");
    expect(issue?.message).toContain("rules.RENDERING");
  });

  it("reports misplaced and misnamed files", () => {
    const root = writeFixture(undefined, {
      [`${PATHS.docDir}/notes.txt`]: "scratch",
      "content/vocabulary/wrong-name.yml":
        "schema_version: 2\nterm: capital\noriginal: { sg: capital }\ndefinition: { short: x }\nrenderings: { capital: { forms: { sg: capital }, reason: keep } }\ndefault: capital\n",
    });
    const found = codes(root);
    expect(found).toContain("warning layout/unknown-file");
    expect(found).toContain("error layout/term-file-name");
  });
});
