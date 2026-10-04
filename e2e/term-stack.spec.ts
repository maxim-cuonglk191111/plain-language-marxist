// Task 024: terms inside a term card open nested cards, up to 5; each click
// outside (or Escape) closes one.
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";
const cards = (page: Page) => page.getByRole("dialog");
const top = (page: Page) => cards(page).last();

/** Clicks a term link in the top card whose term is not open yet; returns its slug. */
async function openNested(page: Page): Promise<string> {
  const open = await cards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label")?.split(": ").pop() ?? ""),
  );
  const links = top(page).locator("a.term-link:visible");
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const name = (await link.innerText()).trim();
    if (!open.includes(name)) {
      const slug = (await link.getAttribute("data-term-link")) ?? "";
      const before = await cards(page).count();
      await link.click();
      await expect(cards(page)).toHaveCount(before + 1);
      return slug;
    }
  }
  throw new Error(`no unopened term link in the top card (open: ${open.join(", ")})`);
}

/** A click on empty page space, outside every card. */
async function clickOutside(page: Page) {
  const size = page.viewportSize();
  await page.mouse.click((size?.width ?? 1280) - 8, (size?.height ?? 800) - 8);
}

async function openFirstCard(page: Page) {
  await page.goto(`${DOC}?view=original#p00013`);
  await page.locator("#p00013 .layer-original a.term").first().click();
  await expect(cards(page)).toHaveCount(1);
}

test("a term inside a card opens a nested card; one outside click closes one", async ({ page }) => {
  await openFirstCard(page);
  await openNested(page);
  await openNested(page);
  await expect(cards(page)).toHaveCount(3);
  await expect(top(page)).toHaveAttribute("aria-label", /^Term card 3 of 3: /);
  // Only the top card is interactive.
  await expect(cards(page).first()).toHaveAttribute("inert", "");

  await clickOutside(page);
  await expect(cards(page)).toHaveCount(2);
  await clickOutside(page);
  await expect(cards(page)).toHaveCount(1);
  await clickOutside(page);
  await expect(cards(page)).toHaveCount(0);
});

test("at most 5 cards; the fifth card's terms are not clickable; 5 clicks close all", async ({
  page,
}) => {
  await openFirstCard(page);
  for (let i = 2; i <= 5; i++) await openNested(page);
  await expect(cards(page)).toHaveCount(5);
  await expect(top(page).locator("a.term-link")).toHaveCount(0);
  await expect(top(page)).toContainText("Close a card to open more");

  for (let left = 4; left >= 0; left--) {
    await clickOutside(page);
    await expect(cards(page)).toHaveCount(left);
  }
});

test("Escape closes one card and returns focus to the link that opened it", async ({ page }) => {
  await openFirstCard(page);
  const slug = await openNested(page);
  await page.keyboard.press("Escape");
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator(":focus")).toHaveAttribute("data-term-link", slug);
  await page.keyboard.press("Escape");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator(":focus")).toHaveClass(/\bterm\b/); // back on the term in the text
});

test("the trail returns to an earlier card, and an open term is not opened twice", async ({
  page,
}) => {
  await openFirstCard(page);
  const firstName = (await cards(page).first().getAttribute("aria-label"))?.split(": ").pop();
  await openNested(page);
  await openNested(page);
  await top(page).locator(".term-trail button").first().click();
  await expect(cards(page)).toHaveCount(1);

  // A link back to a term already in the stack closes down to it instead of opening a copy.
  await openNested(page);
  const back = top(page).locator("a.term-link:visible", { hasText: firstName ?? "" });
  if ((await back.count()) > 0) {
    await back.first().click();
    await expect(cards(page)).toHaveCount(1);
  }
});

test("the vocabulary page links terms in its text", async ({ page }) => {
  await page.goto("/vocabulary/mode-of-production/");
  await expect(page.locator(".prose-page p a[href^='/vocabulary/']").first()).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("terms on the vocabulary page are plain links", async ({ page }) => {
    await page.goto("/vocabulary/relations-of-production/");
    const link = page.locator(".prose-page a[href='/vocabulary/means-of-production/']").first();
    await expect(link).toBeVisible();
  });
});

test("@mobile nested cards stack as bottom sheets; tapping outside closes one", async ({
  page,
}) => {
  await page.goto(`${DOC}?view=original#p00013`);
  await page.locator("#p00013 .layer-original a.term").first().click();
  await openNested(page);
  await expect(cards(page)).toHaveCount(2);
  const box = await top(page).boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && Math.round(box.y + box.height)).toBe(viewport?.height);
  await page.mouse.click(10, 10);
  await expect(cards(page)).toHaveCount(1);
});
