import { describe, expect, it } from "vitest";
import { buildProgram } from "./program.ts";

describe("plm", () => {
  it("is named plm and describes itself in --help", () => {
    const program = buildProgram();
    expect(program.name()).toBe("plm");
    expect(program.helpInformation()).toContain("Plain Language Marxist");
  });
});
