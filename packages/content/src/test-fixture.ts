// Builds a small, fully valid content repository in a temp dir for tests.
// Hashes are computed for real, so validate() must report nothing on it.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import { basedOnHash, passageHash } from "./hash.ts";

const WORK_DIR = "content/works/marx/1848/communist-manifesto";
const DOC_DIR = `${WORK_DIR}/ch01`;
export const DOC_PUBLIC_PATH = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

const h = (text: string) => passageHash(text) ?? "";

function passage(id: string, type: string, text: string, extra: Record<string, unknown> = {}) {
  return { id, type, ...extra, text, hash: h(text), state: "active" };
}

export function fixtureData() {
  const passages = [
    passage("p00001", "heading", "I. Bourgeois and Proletarians", { level: 2 }),
    passage(
      "p00002",
      "paragraph",
      'The history of all hitherto existing society<fn ref="1"/> is the history of class struggles.',
    ),
    passage(
      "p00003",
      "paragraph",
      "Freeman and slave, patrician and plebeian, in a word, oppressor and oppressed.",
    ),
    {
      ...passage("p00004", "paragraph", "A paragraph removed by a source update."),
      state: "tombstoned",
    },
    passage(
      "p00005",
      "paragraph",
      "The modern bourgeois society has not done away with class antagonisms.",
    ),
    passage("p00006", "footnote", "That is, all <i>written</i> history.", { label: "1" }),
  ];
  const hashOf = (id: string) => passages.find((p) => p.id === id)?.hash ?? "";
  const rendering = (covers: string[], text: string) => ({
    covers,
    based_on: basedOnHash(covers.map(hashOf)),
    revision: 1,
    ai_assisted: false,
    text,
  });

  return {
    [`${WORK_DIR}/work.yml`]: {
      schema_version: 5,
      id: "work:marx:1848:communist-manifesto",
      title: "Manifesto of the Communist Party",
      authors: ["marx", "engels"],
      year: 1848,
      translation: { translator: "Samuel Moore", year: 1888 },
      rights: {
        status: "PUBLIC_DOMAIN",
        attribution: "Marxists Internet Archive",
        verified_by: "maintainer",
        verified_at: "2026-10-03",
      },
      documents: ["ch01"],
    },
    [`${DOC_DIR}/source.yml`]: {
      schema_version: 5,
      document: "document:marx:1848:communist-manifesto:ch01",
      title: "I. Bourgeois and Proletarians",
      source: {
        provider: "mia",
        url: `https://www.marxists.org${DOC_PUBLIC_PATH}`,
        retrieved_at: "2026-10-03",
        snapshot: "ingestion/snapshots/marx/1848/communist-manifesto/ch01/2026-10-03.html",
        snapshot_hash: `sha256:${"a".repeat(64)}`,
        parser: { name: "mia", version: "1.0.0" },
      },
      passages,
    },
    [`${DOC_DIR}/en-plain.yml`]: {
      schema_version: 5,
      document: "document:marx:1848:communist-manifesto:ch01",
      language: "en",
      register: "plain",
      renderings: {
        p00001: rendering(["p00001"], "I. The {Bourgeoisie} and the Working Class"),
        p00002: rendering(
          ["p00002", "p00003"],
          'All history up to now<fn ref="1"/> has been the history of class struggles.\n\nFree person and slave, oppressor and oppressed.\n',
        ),
        p00005: rendering(
          ["p00005"],
          `Modern capitalist society has not ended class conflict (see <a href="${DOC_PUBLIC_PATH}#p00002">above</a>).`,
        ),
      },
    },
    [`${DOC_DIR}/original-terms.yml`]: {
      schema_version: 5,
      document: "document:marx:1848:communist-manifesto:ch01",
      annotations: [{ passage: "p00005", term: "bourgeoisie", match: "bourgeois", occurrence: 1 }],
    },
    [`${DOC_DIR}/explanations.yml`]: {
      schema_version: 5,
      document: "document:marx:1848:communist-manifesto:ch01",
      explanations: {
        e001: {
          kind: "translation_note",
          targets: ["p00002"],
          text: 'Engels added the footnote in 1888. See the <a href="/vocabulary/bourgeoisie/">bourgeoisie</a> entry.',
          ai_assisted: false,
        },
      },
    },
    [`${DOC_DIR}/crossrefs.yml`]: {
      schema_version: 5,
      document: "document:marx:1848:communist-manifesto:ch01",
      crossrefs: [
        {
          from: "p00002",
          to: "document:marx:1848:communist-manifesto:ch01#p00006",
          kind: "explains",
          note: "Engels' footnote to the 1888 English edition.",
        },
        { from: "p00005", to: "document:marx:1848:communist-manifesto:ch01#p00002", kind: "same-argument" },
      ],
    },
    "content/vocabulary/bourgeoisie.yml": {
      schema_version: 5,
      term: "bourgeoisie",
      original: { sg: "bourgeoisie", adj: "bourgeois" },
      definition: { short: "The class that owns the means of production." },
      renderings: {
        "capitalist-class": {
          forms: { sg: "capitalist class", adj: "capitalist" },
          reason: "Immediately understandable.",
        },
      },
      default: "capitalist-class",
    },
    "content/collections/foundations.yml": {
      schema_version: 5,
      kind: "reading_path",
      id: "foundations",
      title: "Foundation texts",
      items: ["work:marx:1848:communist-manifesto"],
      rationale: "A suggested starting point.",
    },
  } as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type FixtureData = ReturnType<typeof fixtureData>;
export const PATHS = {
  work: `${WORK_DIR}/work.yml`,
  source: `${DOC_DIR}/source.yml`,
  rendering: `${DOC_DIR}/en-plain.yml`,
  terms: `${DOC_DIR}/original-terms.yml`,
  explanations: `${DOC_DIR}/explanations.yml`,
  crossrefs: `${DOC_DIR}/crossrefs.yml`,
  term: "content/vocabulary/bourgeoisie.yml",
  collection: "content/collections/foundations.yml",
  docDir: DOC_DIR,
};

/** Writes the fixture (optionally mutated) to a fresh temp dir and returns its root. */
export function writeFixture(
  mutate?: (data: FixtureData) => void,
  raw: Record<string, string> = {},
): string {
  const data = fixtureData();
  mutate?.(data);
  const root = mkdtempSync(join(tmpdir(), "plm-content-"));
  const files: Record<string, string> = {
    ...Object.fromEntries(Object.entries(data).map(([p, d]) => [p, stringify(d)])),
    ...raw,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
