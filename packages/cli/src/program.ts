import { readFileSync, writeFileSync } from "node:fs";
import { Command } from "commander";
import { runAnnotate } from "./commands/annotate.ts";
import { runApply, runPrompt } from "./commands/draft.ts";
import { runImport } from "./commands/import.ts";
import { runMigrate } from "./commands/migrate.ts";
import { runValidate, type ValidateCliOptions } from "./commands/validate.ts";

export function buildProgram(): Command {
  const program = new Command("plm")
    .description("Plain Language Marxist content tooling")
    .version("0.0.0");

  program
    .command("import")
    .description("Import a source document from an allowlisted URL into content/")
    .argument("<url>", "source URL, e.g. https://www.marxists.org/archive/…/ch01.htm")
    .option("--work <author/year/slug>", "target work, when it cannot be derived from the URL")
    .option("--doc <name>", "target document name, when it cannot be derived from the URL")
    .option("--via <mode>", "direct or wayback (default: from config/sources.yml)")
    .option("--root <dir>", "repository root", ".")
    .option("-y, --yes", "write without asking")
    .action(
      async (
        url: string,
        opts: { work?: string; doc?: string; via?: string; root: string; yes?: boolean },
      ) => {
        if (opts.via !== undefined && opts.via !== "direct" && opts.via !== "wayback") {
          throw new Error("--via must be direct or wayback");
        }
        const result = await runImport({
          url,
          root: opts.root,
          ...(opts.work ? { work: opts.work } : {}),
          ...(opts.doc ? { doc: opts.doc } : {}),
          ...(opts.via ? { via: opts.via as "direct" | "wayback" } : {}),
          ...(opts.yes ? { yes: true } : {}),
        });
        process.exitCode = result ? 0 : 1;
      },
    );

  program
    .command("annotate")
    .description("Mark whole-word occurrences of vocabulary terms in a document's original text")
    .argument("<document-dir>", "e.g. content/works/marx/1848/communist-manifesto/ch01")
    .option("--root <dir>", "repository root", ".")
    .action((documentDir: string, opts: { root: string }) => {
      process.exitCode = runAnnotate(documentDir, opts.root);
    });

  program
    .command("prompt")
    .description("Print a self-contained LLM prompt for passages of a document (Copy for LLM)")
    .argument("<document-dir>", "e.g. content/works/marx/1848/communist-manifesto/ch01")
    .option("--from <id>", "first passage, e.g. p00008")
    .option("--to <id>", "last passage")
    .option("--next <n>", "the next N passages without a rendering (default 15)")
    .option("--language <code>", "rendering language", "en")
    .option("--register <name>", "rendering register", "plain")
    .option("--root <dir>", "repository root", ".")
    .option("--out <file>", "write the prompt to a file instead of stdout")
    .action(
      (
        documentDir: string,
        opts: {
          from?: string;
          to?: string;
          next?: string;
          language: string;
          register: string;
          root: string;
          out?: string;
        },
      ) => {
        const prompt = runPrompt(documentDir, {
          root: opts.root,
          language: opts.language,
          register: opts.register,
          ...(opts.from ? { from: opts.from } : {}),
          ...(opts.to ? { to: opts.to } : {}),
          ...(opts.next ? { next: Number(opts.next) } : {}),
        });
        if (opts.out) writeFileSync(opts.out, prompt);
        else console.log(prompt);
      },
    );

  program
    .command("apply")
    .description("Check renderings in the exchange format and write them into the document")
    .argument("<document-dir>", "e.g. content/works/marx/1848/communist-manifesto/ch01")
    .argument("<file>", "file with === p… sections, or - for stdin")
    .option("--ai", "declare that an AI/LLM was used to draft this text")
    .option("--human", "declare that no AI was used")
    .option("--language <code>", "rendering language", "en")
    .option("--register <name>", "rendering register", "plain")
    .option("--root <dir>", "repository root", ".")
    .action(
      (
        documentDir: string,
        file: string,
        opts: { ai?: boolean; human?: boolean; language: string; register: string; root: string },
      ) => {
        if (Boolean(opts.ai) === Boolean(opts.human)) {
          throw new Error("declare how the text was written: pass exactly one of --ai or --human");
        }
        const input = readFileSync(file === "-" ? 0 : file, "utf8");
        process.exitCode = runApply(documentDir, input, {
          root: opts.root,
          language: opts.language,
          register: opts.register,
          aiAssisted: Boolean(opts.ai),
        });
      },
    );

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
