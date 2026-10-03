# Task 011 — Structural checks, exchange format, plm prompt / plm apply

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 005, 010 |

## Goal
Build the safeguards that every contribution goes through (SDD §8.4, §8.5). The same package will later run in the editor and in the API.

## Scope
- **`packages/checks`.** Runtime-agnostic: no Node APIs, because it must also run in the browser.
  - **Errors** (block the write):
    - unknown, duplicate or non-contiguous passage IDs;
    - overlapping coverage;
    - empty text;
    - bad tokens;
    - disallowed markup;
    - tombstoned passages.
  - **Warnings** (shown, don't block):
    - numbers differ from the original;
    - negation or modal words lost;
    - quotation count changed;
    - capitalized names missing;
    - length ratio outside 0.5–2.0;
    - a question became a statement;
    - authorial distancing ("Marx and Engels argue/call/say…");
    - an inline gloss right after a known term (an em-dash or "meaning…");
    - added framing sentences ("In other words…").

    Use the earlier AI draft of Ch. I paragraphs 6–15 (task 005) as a regression fixture. It must trigger the length, distancing and gloss warnings.
- **Exchange format.** Parser and serializer for `=== p00017` headers. A header can list several IDs when one rendering covers several passages.
- **`plm prompt <doc> <range>`.** Prints a self-contained LLM prompt containing the style guide (task 005), the work's term table and the passages.
- **`plm apply <doc> <file> [--ai]`.**
  - Parses an LLM reply and runs the checks.
  - Prints errors and warnings.
  - Writes the renderings, incrementing `revision` and setting `based_on` and `ai_assisted`.
  - Refuses to write anything if there are errors.

## Acceptance
- Unit tests cover every check rule and the edge cases of the exchange format.
- A full round trip works: `plm prompt` → manual LLM step → `plm apply` produces valid content.

## Notes (on completion)
- `packages/checks` contains the exchange-format parser (it tolerates a code fence around the whole answer and rejects any introduction before the first header), `checkRenderings` (errors and warnings) and the prompt builder. The prompt builder pulls the core rules verbatim from STYLE.md.
- **Round trip verified with the real CLI:** `plm prompt --from p00009 --to p00010`, then a hand-written "LLM" answer wrapped in a code fence, then `plm apply --ai`, then `plm validate` with no problems. Re-applying replaced both renderings at revision 2.
- `plm apply` requires exactly one of `--ai` or `--human`: declaring AI use is mandatory.
- **Changes found while testing:**
  - The length warning threshold is lowered from 2.5 to 2.0. The over-explaining AI draft was 2.4× and slipped through at 2.5. The SDD is updated.
  - Added a **footnote-marker** warning: dropping `<fn ref>` went unnoticed before.
  - The gloss check gave a false positive on a dash that only restructured the original ("journeyman — in a word…"). It now flags only dashes or parentheses followed by words the original lacks.
- The AI draft of paragraphs 6 and 15 is a regression test: it must trigger the length, distancing, gloss and framing warnings.
