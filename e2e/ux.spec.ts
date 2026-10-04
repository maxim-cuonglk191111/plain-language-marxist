// UX fixes from the maintainer's QA pass (2026-10-04).
import { expect, test } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

test("the settings panel closes on a click outside and when focus leaves it", async ({ page }) => {
  await page.goto(DOC);
  const toggle = page.getByRole("button", { name: "Settings" });
  const panel = page.locator("#reader-settings");
  await toggle.click();
  await expect(panel).toBeVisible();
  await page.mouse.click(10, 500);
  await expect(panel).toBeHidden();

  await toggle.click();
  await expect(panel).toBeVisible();
  await page.getByRole("link", { name: "Vocabulary" }).focus();
  await expect(panel).toBeHidden();
});

test("search marks the words it matched, and the reader highlights them on arrival", async ({
  page,
}) => {
  await page.goto("/search/?q=guild");
  await expect(page.locator(".search-results mark").first()).toHaveText(/^guild/i);
  const link = page.locator(".search-results li a").first();
  await expect(link).toHaveAttribute("href", /[?&]hl=guild/);
  await link.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (CSS as unknown as { highlights?: Map<string, { size: number }> }).highlights?.get(
            "search-hit",
          )?.size ?? 0,
      ),
    )
    .toBeGreaterThan(0);
});

test("an open card dims the page and the cards below it", async ({ page }) => {
  await page.goto(`${DOC}?layers=original#p00013`);
  await page.locator("#p00013 .layer-original button.term").first().click();
  await expect(page.locator(".term-backdrop")).toBeVisible();
  await page.getByRole("dialog").locator("button.term-link:visible").first().click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  const filter = await page
    .getByRole("dialog")
    .first()
    .evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toContain("blur");
  // A tap on the dimmed page closes one card.
  await page.locator(".term-backdrop").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("when every rendering is AI-assisted, the reader says so once, not per paragraph", async ({
  page,
}) => {
  await page.goto(DOC);
  await expect(page.locator(".ai-note")).toBeVisible();
  await expect(page.locator(".rows .badge")).toHaveCount(0);
});

test("the home page has one obvious way into the text", async ({ page }) => {
  await page.goto("/");
  const start = page.locator("a.start-reading");
  await expect(start).toHaveAttribute("href", DOC);
});

test("@mobile bookmark stars are visible without hover on touch screens", async ({ page }) => {
  await page.goto(DOC);
  const star = page.locator("#p00009 button.bookmark");
  await expect(star).toBeVisible();
  expect(Number(await star.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);
});
