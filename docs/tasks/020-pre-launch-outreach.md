# Task 020 — Pre-launch outreach and first reviewers

| | |
|---|---|
| **Status** | In progress |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 012 |

## Goal
Prepare the community before the public launch. How the project is received will depend on the quality of the first chapter and on who vouches for it.

## Scope
- **Contact MIA volunteers as a courtesy.** Explain the project, how it credits MIA, and that it is not affiliated with MIA (SDD §10.1). Ask whether they have concerns.
- **Recruit at least 3 reviewers** from reading groups, educators or students. Add them to `governance.yml` (task 006).
- **Publish the editorial principles** (task 005) and an FAQ that answers the expected objections:
  - **"Dumbing down."** Only the vocabulary is simplified, never the argument, and the original is always one click away.
  - **"A translation of a translation."** Explain that the Original layer is itself an English translation.
  - **Terminology disputes.** Default wordings are reviewed, alternatives are always visible, and readers can switch.
  - **AI use.** Always declared, always reviewed by people, never applied automatically.
  - **"Hasn't this been done?"** Commercial parallel editions exist, e.g. BookCaps' *The Communist Manifesto in Plain and Simple English* (2012). What PLM adds:
    - it is open and free, and anyone can correct it;
    - every wording choice is reviewed and visible;
    - the terminology is transparent and readers can switch it;
    - the original layout is preserved and always one click away.

    Avoid criticizing other editions by name in the FAQ beyond stating this difference.
- **Soft launch** to a small audience first. Turn their feedback into issues before any wider announcement.

## Acceptance
- The FAQ is published and at least 3 reviewers are listed.
- Feedback from the soft launch has been triaged into tasks.

## Progress

### 2026-10-05
- **MIA volunteers contacted.** The maintainer reports that MIA volunteers were told about the project and approved it. The site says only that they "had no objection", and keeps "not affiliated with MIA" (SDD §10.1).
- **Editorial principles and FAQ published on the site** as a draft for the maintainer's review:
  - `/about/` (`apps/web/src/app/about/page.tsx`): the three layers, "only the wording changes", the Original one click away, terms and their alternative wordings, AI use, who checks the text, sources and rights, privacy, and links to STYLE.md, GOVERNANCE.md and LICENSING.md on GitHub.
  - `/faq/` (`apps/web/src/app/faq/page.tsx`): the five expected objections from the scope above, plus neutrality and Context, the MIA relationship, citing passages, reporting mistakes and how to help.
  - Both are static (they work without JavaScript) and linked from the site footer; the header nav is unchanged. `e2e/about.spec.ts` checks rendering with and without JavaScript, the footer links and axe (light and dark).
- **Still needs the maintainer:**
  - recruit at least 3 reviewers and add them to `governance.yml` (then turn off `bootstrap_mode`, GOVERNANCE.md);
  - review and approve the wording of `/about/` and `/faq/`;
  - soft launch to a small audience, and triage the feedback into tasks.
