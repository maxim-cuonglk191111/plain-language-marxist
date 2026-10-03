import { Command } from "commander";

export function buildProgram(): Command {
  return new Command("plm").description("Plain Language Marxist content tooling").version("0.0.0");
}
