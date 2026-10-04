// Task 032, Part E: quote cards, a quote drawn as an image with its source.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

const ready = (page: Page) =>
  expect(page.locator(".row-actions:not([hidden])").first()).toBeAttached();
const card = (page: Page) => page.locator(".quote-canvas");

test("a passage becomes a card, labelled honestly for each layer", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original#p00013`);
  await ready(page);
  await page.locator("#p00013 button.row-actions").click();
  await page
    .getByRole("toolbar", { name: "Passage actions" })
    .getByRole("button", { name: "Quote card" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Quote card" });
  await expect(dialog).toBeVisible();

  await expect(card(page)).toHaveAttribute("aria-label", /^Plain English version: “Our era/);
  await expect(card(page)).toHaveAttribute(
    "aria-label",
    /Manifesto I\.13\. Plain English version by Plain Language Marxist, not the original wording\./,
  );
  // Something is really drawn: the image is far from blank.
  expect(
    (await card(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).length,
  ).toBeGreaterThan(20000);

  await dialog.getByRole("radio", { name: "Original" }).check();
  await expect(card(page)).toHaveAttribute("aria-label", /^Original text: “Our epoch/);
  await expect(card(page)).toHaveAttribute("aria-label", /translated by Samuel Moore \(1888\)\./);

  const results = await new AxeBuilder({ page }).include(".quote-dialog").analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download image" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("manifesto-I-13.png");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("selected words become a card in their own layer only", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original#p00009`);
  await ready(page);
  await page.evaluate(() => {
    const el = document.querySelector("#p00009 .col-original p.block");
    const node = el && document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
    if (!node) throw new Error("no text");
    const r = document.createRange();
    r.setStart(node, 0);
    r.setEnd(node, 30);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(r);
  });
  await page
    .getByRole("toolbar", { name: "Selected words" })
    .getByRole("button", { name: "Quote card" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Quote card" });
  await expect(card(page)).toHaveAttribute(
    "aria-label",
    /^Original text: “The history of all hitherto ex”/,
  );
  await expect(dialog.getByRole("radio", { name: "Plain English" })).toHaveCount(0);
});
