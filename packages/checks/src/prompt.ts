import type { TermFile } from "@plm/schema";
import { serializeExchange } from "./exchange.ts";

/** The block between <!-- core-rules:start --> and <!-- core-rules:end --> in STYLE.md, verbatim. */
export function extractCoreRules(styleGuide: string): string {
  const m = /<!-- core-rules:start -->\n([\s\S]*?)\n<!-- core-rules:end -->/.exec(styleGuide);
  if (!m?.[1]) throw new Error("STYLE.md has no core-rules block");
  return m[1].trim();
}

/** The prompt between the two ---8<--- lines of llm-prompt.md. */
export function extractTemplate(promptDoc: string): string {
  const parts = promptDoc.split(/^---8<---$/m);
  if (parts.length < 3 || !parts[1])
    throw new Error("llm-prompt.md has no ---8<--- delimited template");
  return parts[1].trim();
}

/** Forms whose word can equal another form's (e.g. "bourgeois" as adjective and as a person). */
const FORM_HINTS: Record<string, string> = { person: " (one person)", persons: " (people)" };

/** Term table for the prompt: only terms with a real choice of wording, so the LLM uses tokens for them. */
export function termTable(terms: readonly TermFile[]): string {
  const lines = terms
    .filter((t) => Object.keys(t.renderings).length > 1)
    .map((t) => {
      const forms = Object.entries(t.original)
        .map(([form, word]) =>
          form === "sg"
            ? `{${t.term}} for "${word}"`
            : `{${t.term}:${form}} for "${word}"${FORM_HINTS[form] ?? ""}`,
        )
        .join(", ");
      return `- ${forms}`;
    });
  return lines.length ? lines.join("\n") : "(no term tokens needed for these passages)";
}

export function buildPrompt(input: {
  template: string;
  coreRules: string;
  work: string;
  terms: readonly TermFile[];
  passages: readonly { id: string; text: string }[];
}): string {
  return input.template
    .replace("{{WORK}}", input.work)
    .replace("{{CORE_RULES}}", input.coreRules)
    .replace("{{TERMS}}", termTable(input.terms))
    .replace(
      "{{PASSAGES}}",
      serializeExchange(input.passages.map((p) => ({ covers: [p.id], text: p.text }))).trim(),
    );
}
