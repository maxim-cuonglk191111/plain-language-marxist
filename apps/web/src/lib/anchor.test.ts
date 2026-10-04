import { describe as group, expect, it } from "vitest";
import { describe, locate } from "./anchor";

const TEXT =
  "The history of all society up to now is the history of class struggles. Free person and slave, patrician and plebeian.";

group("text-quote anchoring", () => {
  it("finds an exact match where it was", () => {
    const start = TEXT.indexOf("class struggles");
    const q = describe(TEXT, start, start + "class struggles".length);
    expect(locate(TEXT, q)).toEqual({ start, end: start + 15 });
  });

  it("follows the words when the text around them shifts", () => {
    const start = TEXT.indexOf("class struggles");
    const q = describe(TEXT, start, start + 15);
    const revised = TEXT.replace(
      "The history of all society",
      "The written history of every society",
    );
    const found = locate(revised, q);
    expect(found && revised.slice(found.start, found.end)).toBe("class struggles");
    expect(found?.start).toBe(revised.indexOf("class struggles"));
  });

  it("uses the context to pick the right one of several matches", () => {
    // "history" appears twice; the second is preceded by "is the ".
    const second = TEXT.indexOf("history", 10);
    const q = describe(TEXT, second, second + 7);
    expect(locate(TEXT, { ...q, start: 0 })?.start).toBe(second);
  });

  it("returns null when the quoted words are gone", () => {
    const start = TEXT.indexOf("plebeian");
    const q = describe(TEXT, start, start + 8);
    expect(locate(TEXT.replace("plebeian", "commoner"), q)).toBeNull();
  });
});
