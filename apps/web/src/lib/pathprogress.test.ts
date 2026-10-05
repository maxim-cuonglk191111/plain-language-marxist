import { describe, expect, it } from "vitest";
import { migrateHistory, type History } from "./history";
import {
  isDone,
  nextChapter,
  normalizePathTicks,
  pathCounts,
  setTick,
  type PathStep,
} from "./pathprogress";

const W = "/archive/marx/works/1848/communist-manifesto/";
const CH = (n: number) => `${W}ch0${n}.htm`;
const chapter = (n: number) => ({ path: CH(n), title: `Chapter ${n}`, minutes: 10 });

const history = (finished: number[]): History =>
  migrateHistory({
    v: 1,
    docs: Object.fromEntries(
      finished.map((n) => [CH(n), { title: `Chapter ${n}`, finished: true }]),
    ),
  });

const steps: PathStep[] = [
  { kind: "chapter", title: "Chapter 1", href: CH(1), work: "Manifesto", chapters: [chapter(1)] },
  {
    kind: "work",
    title: "Manifesto",
    href: W,
    work: "Manifesto",
    chapters: [chapter(1), chapter(2), chapter(3)],
  },
];

describe("normalizePathTicks", () => {
  it("starts empty from nothing or garbage", () => {
    for (const raw of [null, undefined, "oops", 7, [], { v: 1 }, { v: 1, paths: "x" }])
      expect(normalizePathTicks(raw)).toEqual({ v: 1, paths: {} });
  });

  it("keeps boolean marks and drops everything else", () => {
    expect(
      normalizePathTicks({
        v: 1,
        paths: {
          a: { [CH(1)]: true, [CH(2)]: false, [CH(3)]: "yes", [CH(4)]: 1 },
          b: [true],
          c: null,
          d: {},
        },
      }),
    ).toEqual({ v: 1, paths: { a: { [CH(1)]: true, [CH(2)]: false } } });
  });

  it("reads a future or missing version stamp as v1", () => {
    expect(normalizePathTicks({ v: 9, paths: { a: { [CH(1)]: true } } })).toEqual({
      v: 1,
      paths: { a: { [CH(1)]: true } },
    });
  });
});

describe("isDone and setTick", () => {
  it("follows the reading history when nothing is marked by hand", () => {
    const ticks = normalizePathTicks(null);
    const h = history([2]);
    expect(isDone(ticks, h, "p", CH(1))).toBe(false);
    expect(isDone(ticks, h, "p", CH(2))).toBe(true);
  });

  it("a hand mark overrides the history on that path only", () => {
    const h = history([2]);
    let ticks = setTick(normalizePathTicks(null), h, "p", CH(1), true);
    ticks = setTick(ticks, h, "p", CH(2), false);
    expect(ticks).toEqual({ v: 1, paths: { p: { [CH(1)]: true, [CH(2)]: false } } });
    expect(isDone(ticks, h, "p", CH(1))).toBe(true);
    expect(isDone(ticks, h, "p", CH(2))).toBe(false);
    expect(isDone(ticks, h, "other", CH(1))).toBe(false);
    expect(isDone(ticks, h, "other", CH(2))).toBe(true);
  });

  it("drops a mark that agrees with the history, and an emptied path", () => {
    const h = history([2]);
    const ticked = setTick(normalizePathTicks(null), h, "p", CH(1), true);
    expect(setTick(ticked, h, "p", CH(1), false)).toEqual({ v: 1, paths: {} });
    expect(setTick(normalizePathTicks(null), h, "p", CH(2), true)).toEqual({ v: 1, paths: {} });
  });

  it("does not change the ticks it was given", () => {
    const h = history([]);
    const before = normalizePathTicks({ v: 1, paths: { p: { [CH(1)]: true } } });
    setTick(before, h, "p", CH(2), true);
    expect(before).toEqual({ v: 1, paths: { p: { [CH(1)]: true } } });
  });
});

describe("nextChapter and pathCounts", () => {
  it("finds the first chapter not done, in path order", () => {
    expect(nextChapter(steps, () => false)?.path).toBe(CH(1));
    expect(nextChapter(steps, (c) => c === CH(1))?.path).toBe(CH(2));
    expect(nextChapter(steps, (c) => c !== CH(3))?.path).toBe(CH(3));
    expect(nextChapter(steps, () => true)).toBeNull();
  });

  it("counts a chapter that appears twice once", () => {
    expect(pathCounts(steps, (c) => c === CH(1))).toEqual({ done: 1, total: 3 });
  });
});
