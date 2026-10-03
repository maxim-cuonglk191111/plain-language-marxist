# Governance

Roles and review rules are stored in [`governance.yml`](governance.yml), so every change to who can approve what is a reviewed, reversible commit (SDD §9).

## Roles

| Role | How you get it | What you can do |
|---|---|---|
| **Reader** | Anyone, no account | Read, search, set preferences |
| **Contributor** | Sign in with a GitHub account at least `min_account_age_days` old | Submit contributions; comment on and review others' work |
| **Trusted contributor** | Automatic after your first merged contribution | Your approvals count toward review thresholds |
| **Reviewer** | A maintainer adds you to `reviewers` in `governance.yml` via PR | Your approval carries more weight (see rules) |
| **Maintainer** | Listed in `maintainers` | Approve any type; manage roles; source and rights changes |

There are no points, karma or leaderboards. Your recognition is your visible contribution history.

## Approval rules

The thresholds are in `governance.yml` under `rules`. Each rule passes when **any** of its options is met.

| Change | Default rule |
|---|---|
| Rendering, explanation, original-term annotation, metadata | 2 trusted contributors **or** 1 reviewer |
| New term alternative | 1 reviewer |
| Change of a term's default wording | 2 reviewers **or** 1 maintainer, and open for at least 7 days |
| Source update, new work (including rights) | 1 maintainer |

These rules always apply:
- Authors cannot approve their own contributions.
- An open "request changes" blocks approval until the author addresses it or a reviewer dismisses it.
- Approvals apply to one revision of a contribution. A material edit resets them.

### Bootstrap mode

While `bootstrap_mode: true`, a single maintainer approval satisfies any rule. This lets the project run before there are enough reviewers. **Turn it off with a PR once there are at least 3 reviewers.**

## Becoming a reviewer

Reviewers are people whose judgement the project trusts on fidelity to the source. As a guide, maintainers look for:
- several merged contributions;
- careful reviews of other people's work;
- familiarity with the [editorial rules](docs/editorial/).

Any maintainer can open a PR adding a handle to `reviewers`. Another maintainer merges it, or, while there is only one maintainer, it merges after 7 days with no objection in the PR.

## Adding and replacing maintainers

- **Adding:** any maintainer proposes the person in a PR to `maintainers`. It merges with the approval of a majority of the current maintainers, after at least 7 days open.
- **Stepping down:** a maintainer removes themselves with a PR. This needs no approval.
- **Inactive maintainers:** a maintainer with no activity for 12 months can be moved off the list by the others, through a PR open for 30 days that @-mentions them.
- **If every maintainer is gone:** anyone may fork. The fork has everything it needs to keep going: content, history, build and deploy instructions. The project is designed so that this works (SDD §1.1, principle 6).

The target is **at least 3 maintainers** who can deploy, run the content pipeline and restore the database.

## Moderation: editorial, not ideological

Reviewers and maintainers judge contributions on:
- fidelity to the source;
- quality and clarity;
- sourcing of explanations;
- spam, harassment and copyright.

They do **not** reject a contribution because it presents an unpopular interpretation. Interpretation belongs in explanations, clearly labelled. Disagreement about wording goes into term alternatives, which stay visible to readers.

## Rights and takedown requests

If someone claims a text or contribution infringes their rights:
1. **Claim.** They open an issue using the rights template, or email a maintainer.
2. **Temporary review.** A maintainer may set the work's rights to `BLOCKED` while the claim is checked. A blocked work is excluded from the next build.
3. **Verification.** A maintainer checks the claim against the work's recorded rights (`work.yml`), and records the result in the issue.
4. **Decision.** The work is restored, restricted or removed, and the outcome is documented in the issue and in `work.yml` notes.

No content is removed informally by one person without a recorded claim and decision.

## Enforcement on GitHub

`.github/CODEOWNERS` assigns originals (`source.yml`), work metadata and rights (`work.yml`) and this governance file to the maintainers. Code-owner review takes effect only when branch protection on `main` has "Require review from Code Owners" enabled.

GitHub does not let anyone approve their own PR. So while there is a single maintainer, leave that setting off, or allow administrators to bypass it. Enable it once a second maintainer exists.
