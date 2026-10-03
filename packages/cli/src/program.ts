import { Command } from "commander";
import { runMigrate } from "./commands/migrate.ts";
import { runValidate, type ValidateCliOptions } from "./commands/validate.ts";

export function buildProgram(): Command {
  const program = new Command("plm")
    .description("Plain Language Marxist content tooling")
    .version("0.0.0");

  program
    .command("validate")
    .description("Check every content invariant; exits non-zero on errors")
    .argument("[root]", "repository root", ".")
    .option("--json", "print issues as JSON")
    .action((root: string, options: ValidateCliOptions) => {
      process.exitCode = runValidate(root, options);
    });

  program
    .command("migrate")
    .description("Check content schema versions and apply migrations (none exist yet)")
    .argument("[paths...]", "content directories or files", ["content", "governance.yml"])
    .action((paths: string[]) => {
      process.exitCode = runMigrate(paths);
    });

  return program;
}
