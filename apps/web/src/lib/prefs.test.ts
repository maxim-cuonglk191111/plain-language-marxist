import { describe, expect, it } from "vitest";
import { BOOT_SCRIPT, DEFAULT_PREFS, PREFS_KEY, applyPrefs, normalizePrefs } from "./prefs";

type Fake = { dataset: Record<string, string>; vars: Record<string, string> };
const fakeRoot = (): Fake & {
  style: { setProperty: (k: string, v: string) => void };
} => {
  const vars: Record<string, string> = {};
  return { dataset: {}, vars, style: { setProperty: (k, v) => void (vars[k] = v) } };
};

/** Runs the inline boot script against a fake <html> and storage. */
function boot(stored: string | null) {
  const root = fakeRoot();
  const storage = { getItem: (k: string) => (k === PREFS_KEY ? stored : null) };
  new Function("document", "localStorage", "location", "URLSearchParams", BOOT_SCRIPT)(
    { documentElement: root },
    storage,
    { search: "" },
    URLSearchParams,
  );
  return root;
}

function applied(stored: string | null) {
  const root = fakeRoot();
  root.dataset["layers"] = "plain";
  root.dataset["cols"] = "1";
  applyPrefs(normalizePrefs(stored ? JSON.parse(stored) : null), root as never);
  return root;
}

describe("normalizePrefs", () => {
  it("gives the defaults for nothing or garbage", () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs("x")).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs({ theme: "neon", size: "huge", wpm: 999 })).toEqual(DEFAULT_PREFS);
  });

  it("maps the pre-031 named sizes to the nearest pixel size", () => {
    expect(normalizePrefs({ size: "s" }).size).toBe(16);
    expect(normalizePrefs({ size: "m" }).size).toBe(17);
    expect(normalizePrefs({ size: "l" }).size).toBe(19);
    expect(normalizePrefs({ size: "xl" }).size).toBe(21);
  });

  it("keeps pre-031 values that are still valid, and clamps sizes", () => {
    const old = normalizePrefs({ theme: "dark", size: "l", leading: "relaxed", terms: "off" });
    expect(old).toMatchObject({ theme: "dark", size: 19, leading: "relaxed", terms: "off" });
    expect(normalizePrefs({ size: 40 }).size).toBe(28);
    expect(normalizePrefs({ size: 9.6 }).size).toBe(14);
  });
});

describe("BOOT_SCRIPT", () => {
  const cases: [string, string | null][] = [
    ["nothing saved", null],
    ["pre-031 prefs", '{"theme":"dark","size":"xl","leading":"relaxed","terms":"off"}'],
    [
      "every new field",
      '{"theme":"sepia","font":"dyslexic","size":24,"leading":"loose","width":"narrow","margins":"large","para":"indented","align":"justify","wpm":300,"terms":"on","focus":"on","aid":"ruler","screen":"on","shortcuts":"off"}',
    ],
    ["unknown values", '{"theme":"neon","font":"comic","size":99,"width":"huge"}'],
    ["not an object", "7"],
    ["null", "null"],
  ];
  for (const [name, stored] of cases) {
    it(`sets the same values as applyPrefs: ${name}`, () => {
      const booted = boot(stored);
      const expected = applied(stored);
      expect(booted.dataset).toEqual(expected.dataset);
      expect(booted.vars).toEqual(expected.vars);
    });
  }
});
