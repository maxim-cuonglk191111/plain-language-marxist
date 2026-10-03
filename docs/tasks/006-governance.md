# Task 006 — Governance file and GOVERNANCE.md

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M0 |
| **Depends on** | 003 |

## Goal
Roles and review thresholds live in Git from day one (SDD §9.1, §9.2).

## Scope
- **`governance.yml`**: the default approval rules from SDD §9.2, `bootstrap_mode: true`, `min_account_age_days: 30`, and the initial maintainer(s).
- **`GOVERNANCE.md`**, covering:
  - the roles;
  - how someone becomes a reviewer (a PR to `governance.yml`);
  - how maintainers are added and replaced;
  - when to turn off `bootstrap_mode` (once there are at least 3 reviewers);
  - that moderation judges edits, not ideology;
  - the process for rights takedown requests (SDD §5.6).
- **`CODEOWNERS`**: changes to `source.yml`, `work.yml` or `governance.yml` need a maintainer's approval.

## Acceptance
- `plm validate` checks `governance.yml`.
- A test PR shows the CODEOWNERS rules taking effect.

## Notes (on completion)
- The maintainer is `maxim-cuonglk191111` (the authenticated GitHub account).
- **Not verified yet:** "CODEOWNERS takes effect on a test PR". The repository has no GitHub remote. Verify this once it is pushed. Branch protection on `main` must enable "Require review from Code Owners" (see GOVERNANCE.md for the single-maintainer caveat).
- `plm validate` and `plm migrate` now run in CI. Content YAML and `governance.yml` are excluded from Prettier, because the `plm` writer owns their format.
