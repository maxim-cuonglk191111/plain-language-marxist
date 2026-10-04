// Task 026: term marks must not break sentences when a browser translates the page.
// Translators treat <button>s as separate units and drop the spaces around them;
// inline links stay part of the sentence.
import { expect, test } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

test("term marks in the text are inline links, never buttons", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original`);
  await expect(page.locator(".rows .block button")).toHaveCount(0);
  const marks = page.locator(".rows a.term");
  expect(await marks.count()).toBeGreaterThan(10);
  await expect(marks.first()).toHaveAttribute("href", /^\/vocabulary\/[a-z0-9-]+\/$/);
  await expect(marks.first()).toHaveAttribute("aria-haspopup", "dialog");
});

test("every term mark keeps the spaces of its sentence", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original`);
  const glued = await page.locator(".rows a.term").evaluateAll((marks) =>
    marks.flatMap((m) => {
      // Only neighbouring text counts; an element such as a footnote marker may follow directly.
      const text = (n: Node | null) =>
        n?.nodeType === Node.TEXT_NODE ? (n.textContent ?? "") : "";
      const before = text(m.previousSibling);
      const after = text(m.nextSibling);
      const okBefore = before === "" || /[\s(“"‘—[/-]$/.test(before);
      const okAfter = after === "" || /^[\s.,;:!?)”"’—\]/-]/.test(after);
      return okBefore && okAfter
        ? []
        : [`${before.slice(-12)}[${m.textContent}]${after.slice(0, 12)}`];
    }),
  );
  expect(glued).toEqual([]);
});

test("the cards still open from the links", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain#p00013`);
  await page.locator("#p00013 .layer-plain a.term:not([data-kept])").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${DOC.replace(/[.]/g, "\\.")}`)); // no navigation
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("a term link opens its vocabulary page", async ({ page }) => {
    await page.goto(DOC);
    const mark = page.locator("#p00013 .layer-original a.term").first();
    const term = await mark.getAttribute("data-term");
    await mark.click();
    await expect(page).toHaveURL(new RegExp(`/vocabulary/${term}/$`));
  });
});
