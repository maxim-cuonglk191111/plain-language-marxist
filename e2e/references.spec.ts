// Task 032, Part A: passage references ("Manifesto II.17"), like verse references in a Bible app.
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const DOC = `${WORK}ch01.htm`;

const ready = (page: Page) =>
  expect(page.locator(".row-actions:not([hidden])").first()).toBeAttached();
const number = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => getComputedStyle(el, "::before").content);

test("search goes straight to a reference, and explains one that points nowhere", async ({
  page,
}) => {
  await page.goto("/search/?q=II.17");
  const go = page.locator(".search-goto a");
  await expect(go).toHaveText("Go to Manifesto II.17 →");
  await expect(go).toHaveAttribute("href", `${WORK}ch02.htm#p00017`);

  await page.locator("#search-input").fill("ch3 5");
  await expect(go).toHaveAttribute("href", `${WORK}ch03.htm#p00005`);
  await page.locator("#search-input").press("Enter");
  await expect(page).toHaveURL(`${WORK}ch03.htm#p00005`);

  await page.goto("/search/?q=Manifesto%20II.99");
  await expect(page.locator(".search .notice")).toHaveText(
    "Manifesto II has 76 passages, so there is no passage 99.",
  );
  await expect(page.locator(".search-goto")).toHaveCount(0);

  // Ordinary words are a search, and results are named by their reference.
  await page.goto("/search/?q=guild");
  await expect(page.locator(".search-goto")).toHaveCount(0);
  await expect(page.locator('.search-results li a[href*=".htm"]').first()).toHaveText(
    /^Manifesto I\.\d+$/,
  );
});

test("the contents drawer has 'Go to a passage'", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain`);
  await ready(page);
  await page.getByRole("button", { name: "Contents" }).click();
  const drawer = page.getByRole("dialog", { name: "Contents" });
  const box = drawer.getByLabel("Go to a passage");

  await box.fill("I.12");
  await box.press("Enter");
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/ch01\.htm\?layers=plain#p00012$/);

  await page.getByRole("button", { name: "Contents" }).click();
  await box.fill("IX.1");
  await box.press("Enter");
  await expect(drawer.locator(".toc-goto-message")).toHaveText("Manifesto has no chapter IX.");
  await box.fill("chapter 4");
  await drawer.getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(`${WORK}ch04.htm`);
});

test("passage numbers show with two layers, and follow the setting", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original#p00013`);
  await ready(page);
  expect(await number(page, "p00013")).toContain("13");
  // A row covering two passages shows both.
  expect(await number(page, "p00011")).toContain("11–12");

  await page.getByRole("button", { name: "Plain English" }).click(); // one layer left: auto hides
  expect(await number(page, "p00013")).toBe("none");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("group", { name: "Passage numbers" }).getByLabel("Show").check();
  expect(await number(page, "p00013")).toContain("13");
  // Not part of the text: selecting the passage never picks up the number.
  const selected = await page.evaluate(() => {
    const r = document.createRange();
    r.selectNodeContents(document.querySelector("#p00013") as Node);
    return r.toString();
  });
  expect(selected).not.toMatch(/^\s*13/);
});

test("the reference appears in the progress bar, the passage actions and Notes", async ({
  page,
}) => {
  await page.goto(`${WORK}ch02.htm?layers=original#p00017`);
  await ready(page);
  await expect(page.locator(".progress-passage")).toHaveText(/^II\.\d+ of 76$/);
  await page.locator("#p00017 button.row-actions").click();
  const bar = page.getByRole("toolbar", { name: "Passage actions" });
  await expect(bar.locator(".passage-bar-title")).toHaveText("Manifesto II.17");
  await bar.getByRole("button", { name: "Bookmark" }).click();
  await page.goto("/notes/");
  await expect(page.locator(".notes-items a")).toHaveText("Manifesto II.17");
});
