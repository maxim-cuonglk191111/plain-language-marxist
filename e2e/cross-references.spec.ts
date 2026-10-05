// Task 032, Part D: "See also" cross-references at the end of the Context cell,
// like cross-references in a study Bible. The fixture links I.9 and I.10 to
// Engels' footnotes and I.9 to II.65 (and back).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const DOC = `${WORK}ch01.htm`;
const toggle = (page: Page, name: string) =>
  page.locator(".layer-switch").getByRole("button", { name, exact: true });
const seeAlso = (page: Page, id: string) => page.locator(`#${id} > .col-context .see-also`);

test("See also follows the Context layer, and its links lead to the passages", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,context#p00009`);
  const line = seeAlso(page, "p00009");
  await expect(line).toBeVisible();
  await expect(line).toHaveText(
    "See also: Manifesto I.63 explains this (Engels' footnote to the 1888 English edition); Manifesto II.65 makes the same argument.",
  );
  // It comes after the explanations of that row.
  await expect(page.locator("#p00009 > .col-context > :last-child")).toHaveClass("see-also");

  await toggle(page, "Context").click();
  await expect(page.locator("html")).toHaveAttribute("data-layers", "plain");
  await expect(line).toBeHidden();
  await toggle(page, "Context").click();
  await expect(line).toBeVisible();

  // Within the chapter, a link to the footnote; across chapters, to the other chapter.
  await line.getByRole("link", { name: "Manifesto I.63" }).click();
  await expect(page).toHaveURL(
    /ch01\.htm\?layers=plain%2Ccontext#p00063$|layers=plain,context#p00063$/,
  );
  await page.goto(`${DOC}?layers=plain,context#p00009`);
  await seeAlso(page, "p00009").getByRole("link", { name: "Manifesto II.65" }).click();
  await expect(page).toHaveURL(`${WORK}ch02.htm#p00065`);
  await expect(seeAlso(page, "p00065")).toHaveText(
    "See also: Manifesto I.9 makes the same argument.",
  );
});

test("a row with no explanations still shows its See also line", async ({ page }) => {
  // I.10 has no explanation of its own (the section one shows at I.9).
  await page.goto(`${DOC}?layers=context#p00010`);
  const cell = page.locator("#p00010 > .col-context");
  await expect(cell).not.toHaveClass(/\bempty\b/);
  await expect(cell.locator(".explanation")).toHaveCount(0);
  await expect(seeAlso(page, "p00010")).toBeVisible();
  await expect(seeAlso(page, "p00010")).toContainText("Manifesto I.64 explains this");
  // Rows without cross-references or explanations stay empty, and hidden with one layer.
  await expect(page.locator("#p00014 > .col-context")).toHaveClass(/\bempty\b/);
  await expect(page.locator("#p00014 > .col-context")).toBeHidden();

  // Untranslated chapters have no Context but their own cross-references.
  await page.goto(`${WORK}ch02.htm?layers=original,context#p00065`);
  await expect(seeAlso(page, "p00065")).toBeVisible();
});

test("See also passes axe", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original,context#p00009`);
  const results = await new AxeBuilder({ page })
    .include(".see-also")
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("See also is server-rendered, with working links", async ({ page }) => {
    await page.goto(DOC);
    const line = seeAlso(page, "p00009");
    await expect(line).toBeVisible();
    await expect(line.getByRole("link", { name: "Manifesto I.63" })).toHaveAttribute(
      "href",
      "#p00063",
    );
    await expect(line.getByRole("link", { name: "Manifesto II.65" })).toHaveAttribute(
      "href",
      `${WORK}ch02.htm#p00065`,
    );
    await expect(seeAlso(page, "p00010")).toBeVisible();
    await line.getByRole("link", { name: "Manifesto II.65" }).click();
    await expect(page).toHaveURL(`${WORK}ch02.htm#p00065`);
    await expect(seeAlso(page, "p00065")).toContainText("Manifesto I.9");
  });
});
