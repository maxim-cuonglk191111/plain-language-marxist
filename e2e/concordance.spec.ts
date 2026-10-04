// Task 032, Part B: "Where this term appears", like a concordance in a study Bible.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const TERM = "/vocabulary/bourgeoisie/";

test("the count on the term page equals the marks a reader sees in every chapter", async ({
  page,
}) => {
  let seen = 0;
  for (const ch of ["ch01", "ch02", "ch03", "ch04"]) {
    await page.goto(`${WORK}${ch}.htm?layers=plain,original`);
    // Untranslated rows show "not yet available", so count what is really in each layer.
    seen += await page
      .locator(
        '.rows .col-plain a.term[data-term="bourgeoisie"], .rows .col-original a.term[data-term="bourgeoisie"]',
      )
      .count();
  }
  await page.goto(TERM);
  await expect(page.locator("#appears")).toHaveText(`Where this term appears (${seen})`);
  expect(seen).toBeGreaterThan(20);
});

test("each occurrence links to its passage, in its layer, with the word marked", async ({
  page,
}) => {
  await page.goto(TERM);
  const section = page.locator(".appears");
  await expect(section.locator("summary").first()).toContainText(
    "Chapter I. Bourgeois and Proletarians",
  );
  const plain = section
    .locator("li", { has: page.locator(".layer-tag", { hasText: "Plain English" }) })
    .first();
  await expect(plain.locator("a")).toHaveText(/^Manifesto I\.\d+$/);
  // The default wording, in whatever form the sentence uses ("capitalist class", "capitalist").
  await expect(plain.locator("mark")).toHaveText(/^capitalist/i);
  const href = await plain.locator("a").getAttribute("href");
  expect(href).toMatch(/ch01\.htm\?layers=plain&hl=[^#]+#p\d{5}$/);

  const original = section
    .locator("li", { has: page.locator(".layer-tag", { hasText: "Original" }) })
    .first();
  // Any form the Original uses ("Bourgeois" in the chapter heading, "bourgeoisie", ...).
  await expect(original.locator("mark")).toHaveText(/^bourgeois/i);
  // Long lists start folded: open the chapter, as a reader would.
  await section.locator("summary").first().click();
  await original.locator("a").click();
  await expect(page).toHaveURL(/layers=original/);

  await page.goto(TERM);
  const results = await new AxeBuilder({ page })
    .include(".appears")
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
});

test("a term card says how often the term appears, and links there", async ({ page }) => {
  await page.goto(`${WORK}ch01.htm?layers=original#p00013`);
  await page.locator("#p00013 .layer-original a.term").first().click();
  const link = page
    .getByRole("dialog")
    .getByRole("link", { name: /Appears \d+ times in the texts/ });
  await expect(link).toHaveAttribute("href", "/vocabulary/bourgeoisie/#appears");
  const n = Number(/Appears (\d+)/.exec((await link.textContent()) ?? "")?.[1]);
  await link.click();
  await expect(page.locator("#appears")).toHaveText(`Where this term appears (${n})`);
});
