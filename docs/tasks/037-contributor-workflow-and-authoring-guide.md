# Task 037 — Contributor Workflow and Authoring Guide

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-05 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M2 (community contributions) |
| **Depends on** | 005, 006, 010 |

## Problem
Prospective contributors currently have no single entry point or authoring guide explaining how to contribute from scratch:
1. **Tribal rules:** Crucial editorial constraints (Plain English sentences $\le 35$ words, explanations $\le 25$ words, zero inline glosses, zero ideological softening, tokens required for all marked terms) are scattered across `STYLE.md`, `hard-words.yml`, and CLI error messages.
2. **Missing Authoring Templates:** Adding a new term card or new translation requires manually inspecting existing YAML files in `content/vocabulary/` and `content/works/`.
3. **No Scratch / Editor Tooling:** Non-developers or writers unfamiliar with git monorepos cannot easily test whether their draft passes validation without setting up the entire Node/pnpm dev environment.

## Scope
1. **Root `CONTRIBUTING.md`:**
   - **Getting Started:** Clone, install with `corepack pnpm install`, run `pnpm check`.
   - **Contribution Types:**
     - Proposing a new or improved term rendering.
     - Adding a historical context explanation.
     - Proofreading and refining Plain English passages.
     - Translating a new text.
   - **Term Card Authoring Guide:**
     - Structure of `content/vocabulary/{term}.yml`: definitions, original forms, alternative renderings, reasons, limitations.
     - Rules: no dictionary loops, pronunciation guide in IPA and respelling for non-English words, cite historical sources (e.g. Engels 1888 notes).
   - **Plain English Checklist:**
     - Sentence length limit: $\le 35$ words.
     - Explanation sentence limit: $\le 25$ words.
     - Term token forms: use `{term:form}` matching declared forms (never bare token if `sg` is absent).
     - Inline gloss check: never place an em-dash immediately after a token.
     - Hard words: check against `config/hard-words.yml`.
2. **CLI Scaffolding Tool (`pnpm plm scaffold:term`):**
   - Provide a quick generator command that creates a valid skeleton term card in `content/vocabulary/` with placeholders and field documentation comments.
3. **Web-based Scratch Editor (Design Spike):**
   - Specify a lightweight `/contribute` or `/editor` route (available in local dev mode) where writers can paste a draft passage, see instant token highlighting, word-count alerts, and inline rule violations before committing.

## Acceptance
- A comprehensive `CONTRIBUTING.md` exists at repository root and is linked from `README.md`.
- A new contributor can create a valid term card from scratch following the guide in under 15 minutes.
- `pnpm check` passes with all links validated.
