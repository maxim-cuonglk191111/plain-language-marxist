// Task 023: three switchable layers (Plain English | Original | Context),
// never fewer than one; columns on wide screens, rows on phones.
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";
const toggle = (page: Page, name: string) =>
  page.locator(".layer-switch").getByRole("button", { name, exact: true });
const visible = (page: Page, id: string) => ({
  plain: page.locator(`#${id} > .col-plain`),
  original: page.locator(`#${id} > .col-original`),
  context: page.locator(`#${id} > .col-context`),
});

async function inViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight;
  });
}

test("defaults to Plain English only; toggles add and remove layers and are remembered", async ({
  page,
}) => {
  await page.goto(DOC);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-layers", "plain");
  const row = visible(page, "p00009");
  await expect(row.plain).toBeVisible();
  await expect(row.original).toBeHidden();

  await toggle(page, "Original").click();
  await toggle(page, "Context").click();
  await expect(html).toHaveAttribute("data-layers", "plain original context");
  await expect(html).toHaveAttribute("data-cols", "3");
  await expect(page).toHaveURL(
    /[?&]layers=plain%2Coriginal%2Ccontext|layers=plain,original,context/,
  );
  await expect(row.original).toBeVisible();
  await expect(row.context).toContainText("About this section");

  await toggle(page, "Plain English").click();
  await expect(row.plain).toBeHidden();

  await page.goto(DOC); // remembered without the query
  await expect(html).toHaveAttribute("data-layers", "original context");
});

test("the last visible layer cannot be turned off", async ({ page }) => {
  await page.goto(`${DOC}?layers=original`);
  const original = toggle(page, "Original");
  await expect(original).toHaveAttribute("aria-pressed", "true");
  await expect(original).toHaveAttribute("aria-disabled", "true");
  await expect(original).toHaveAccessibleDescription("At least one layer stays visible.");
  await original.click({ force: true }); // aria-disabled: Playwright would otherwise wait
  await expect(page.locator("html")).toHaveAttribute("data-layers", "original");
  await expect(visible(page, "p00009").original).toBeVisible();
});

for (const [view, layers] of [
  ["plain", "plain"],
  ["original", "original"],
  ["parallel", "plain original"],
] as const) {
  test(`old link ?view=${view} opens the matching layers`, async ({ page }) => {
    await page.goto(`${DOC}?view=${view}`);
    await expect(page.locator("html")).toHaveAttribute("data-layers", layers);
  });
}

for (const layers of ["plain", "plain,original", "plain,original,context", "context"]) {
  test(`deep link #p00013 lands on its row with layers=${layers}`, async ({ page }) => {
    await page.goto(`${DOC}?layers=${layers}#p00013`);
    await expect.poll(() => inViewport(page, "#p00013")).toBe(true);
    // The sticky bar never covers the target (measured in one go, after scrolling).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const bar = document.querySelector(".reader-bar")?.getBoundingClientRect();
          const row = document.querySelector("#p00013")?.getBoundingClientRect();
          return Boolean(bar && row && row.top >= bar.bottom - 1);
        }),
      )
      .toBe(true);
  });
}

test("three layers sit side by side on a wide screen, rows line up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${DOC}?layers=plain,original,context#p00011`);
  // Measured in one go: smooth scrolling may still be moving the page.
  const cells = await page.locator("#p00011").evaluate((row) =>
    [".col-plain", ".col-original", ".col-context"].map((s) => {
      const r = (row.querySelector(`:scope > ${s}`) as HTMLElement).getBoundingClientRect();
      return { x: r.x, y: r.y };
    }),
  );
  const [p, o, e] = cells;
  expect(p && o && e && Math.abs(p.y - o.y) < 2 && Math.abs(o.y - e.y) < 2).toBe(true);
  // Plain | Original | Context, left to right. The row's second passage is a
  // deep-link target, not a grid cell, so Plain English starts at the left.
  expect(p && o && e && p.x < o.x && o.x < e.x && p.x < 100).toBe(true);
});

test("an untranslated passage falls back to the original when it is hidden", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain#p00014`);
  const original = page.locator("#p00014 > .col-original");
  await expect(original).toBeVisible();
  await expect(original.locator(".layer-label")).toBeVisible();
});

test("@mobile layers stack as rows in the same order, labelled", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,original,context#p00009`);
  const row = visible(page, "p00009");
  const boxes = await Promise.all([
    row.plain.boundingBox(),
    row.original.boundingBox(),
    row.context.boundingBox(),
  ]);
  const [p, o, e] = boxes;
  expect(p && o && e && p.y < o.y && o.y < e.y).toBe(true);
  await expect(row.original.locator(".layer-label")).toBeVisible();
  await expect(page.locator(".layer-switch")).toBeInViewport();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every layer shows and there are no toggles", async ({ page }) => {
    await page.goto(DOC);
    const row = visible(page, "p00009");
    await expect(row.plain).toBeVisible();
    await expect(row.original).toBeVisible();
    await expect(row.context).toBeVisible();
    await expect(page.locator(".layer-switch")).toBeHidden();
  });
});

test("old links naming the layer 'explain' open the Context layer", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain,explain`);
  await expect(page.locator("html")).toHaveAttribute("data-layers", "plain context");
  await expect(
    page.locator(".layer-switch").getByRole("button", { name: "Context", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
