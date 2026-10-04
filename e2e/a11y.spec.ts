// WCAG 2.2 AA checks with axe (task 016). Serious and critical violations fail the build.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  ["home", "/"],
  ["reader (plain)", "/archive/marx/works/1848/communist-manifesto/ch01.htm?layers=plain"],
  [
    "reader (two layers)",
    "/archive/marx/works/1848/communist-manifesto/ch01.htm?layers=plain,original",
  ],
  [
    "reader (three layers)",
    "/archive/marx/works/1848/communist-manifesto/ch01.htm?layers=plain,original,explain",
  ],
  ["reader (original)", "/archive/marx/works/1848/communist-manifesto/ch01.htm?layers=original"],
  ["vocabulary", "/vocabulary/"],
  ["term page", "/vocabulary/bourgeoisie/"],
  ["search", "/search/?q=class"],
] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });
    for (const [name, path] of PAGES) {
      test(`${name} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      });
    }
  });
}

test("an open term card has no serious accessibility violations", async ({ page }) => {
  await page.goto("/archive/marx/works/1848/communist-manifesto/ch01.htm?view=plain#p00013");
  await page.locator("#p00013 .layer-plain button.term").first().click();
  const results = await new AxeBuilder({ page }).include(".term-card").analyze();
  expect(
    results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);
});

test("a stack of nested term cards has no serious accessibility violations", async ({ page }) => {
  await page.goto("/archive/marx/works/1848/communist-manifesto/ch01.htm?view=original#p00013");
  await page.locator("#p00013 .layer-original button.term").first().click();
  await page.getByRole("dialog").last().locator("button.term-link:visible").first().click();
  await page.getByRole("dialog").last().locator("button.term-link:visible").first().click();
  await expect(page.getByRole("dialog")).toHaveCount(3);
  const results = await new AxeBuilder({ page }).include(".term-card").analyze();
  expect(
    results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.help}`),
  ).toEqual([]);
});
