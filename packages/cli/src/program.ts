import { Command } from "commander";
import { runMigrate } from "./commands/migrate.ts";

export function buildProgram(): Command {
  const program = new Command("plm")
    .description("Plain Language Marxist content tooling")
    .version("0.0.0");

  program
    .command("migrate")
    .description("Check content schema versions and apply migrations (none exist yet)")
    .argument("[paths...]", "content directories or files", ["content", "governance.yml"])
    .action((paths: string[]) => {
      process.exitCode = runMigrate(paths);
    });

  return program;
}
