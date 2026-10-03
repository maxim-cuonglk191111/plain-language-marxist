import { z } from "zod";
import { GithubHandle, SchemaVersion, checkUnique } from "./common.ts";

/** Contribution types (SDD §8.2). */
export const ContributionType = z.enum([
  "RENDERING",
  "TERM_ALTERNATIVE",
  "TERM_DEFAULT",
  "EXPLANATION",
  "ORIGINAL_TERMS",
  "METADATA",
  "SOURCE_UPDATE",
  "NEW_WORK",
]);
export type ContributionType = z.infer<typeof ContributionType>;

export const ApproverRole = z.enum(["trusted_contributor", "reviewer", "maintainer"]);

/** A rule passes when ANY option is satisfied, e.g. 2 trusted contributors OR 1 reviewer. */
export const ApprovalRule = z.strictObject({
  any_of: z.array(z.strictObject({ role: ApproverRole, count: z.number().int().min(1) })).min(1),
  min_open_days: z.number().int().min(0).optional(),
});

/** governance.yml at the repo root (SDD §9). */
export const GovernanceFile = z
  .strictObject({
    schema_version: SchemaVersion,
    /** While true, one maintainer approval satisfies any rule. */
    bootstrap_mode: z.boolean(),
    min_account_age_days: z.number().int().min(0),
    maintainers: z.array(GithubHandle).min(1),
    reviewers: z.array(GithubHandle),
    /** z.record over an enum is exhaustive: every contribution type needs a rule. */
    rules: z.record(ContributionType, ApprovalRule),
  })
  .superRefine((g, ctx) => {
    const handles = [...g.maintainers, ...g.reviewers].map((h) => h.toLowerCase());
    checkUnique(
      handles,
      ctx,
      ["reviewers"],
      "handle (listed twice, or as both maintainer and reviewer)",
    );
  });
export type GovernanceFile = z.infer<typeof GovernanceFile>;
