// Task 031, Part A: work page, table of contents, previous/next chapter, progress.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const CH = (n: number) => `${WORK}ch0${n}.htm`;

const serious = async (page: Page, include?: string) => {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
  const results = await (include ? builder.include(include) : builder).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
};

test("the work page lists every chapter with a reading time and a way in", async ({ page }) => {
  await page.goto(WORK);
  await expect(page.locator("h1")).toHaveText("Manifesto of the Communist Party");
  await expect(page.locator(".attribution")).toContainText("Samuel Moore");
  const chapters = page.locator(".chapter-list > li");
  await expect(chapters).toHaveCount(4);
  await expect(chapters.first()).toContainText("Chapter I. Bourgeois and Proletarians");
  await expect(chapters.first()).toContainText(/about \d+ min/);
  await expect(page.locator(".work-actions a")).toHaveText("Start reading");
  await expect(page.locator(".work-actions a")).toHaveAttribute("href", CH(1));
  expect(await serious(page)).toEqual([]);
});

test("chapter pages link the work page and announce prev/next in the head", async ({ page }) => {
  await page.goto(CH(2));
  await expect(page.locator(".work-title a")).toHaveAttribute("href", WORK);
  await expect(page.locator('head link[rel="prev"]')).toHaveAttribute("href", CH(1));
  await expect(page.locator('head link[rel="next"]')).toHaveAttribute("href", CH(3));
});

test("the contents drawer opens by button and by 't', traps focus and closes on Escape", async ({
  page,
}) => {
  await page.goto(CH(3));
  const button = page.getByRole("button", { name: "Contents" });
  await button.click();
  const drawer = page.getByRole("dialog", { name: "Contents" });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('a[aria-current="page"]')).toHaveText(
    "Chapter III. Socialist and Communist Literature",
  );
  await expect(drawer.locator(".toc-sections a")).toContainText(["1. Reactionary Socialism"]);
  expect(await serious(page, ".toc-drawer")).toEqual([]);

  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest(".toc-drawer")))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(button).toBeFocused();

  await page.keyboard.press("t");
  await expect(drawer).toBeVisible();
  // A section link jumps there and closes the drawer.
  await drawer.getByRole("link", { name: "2. Conservative or Bourgeois Socialism" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/#p00041$/);
  // Wait for the (smooth) scroll to land before asking where we are.
  await expect
    .poll(() =>
      page.locator("#p00041").evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeLessThan(200);
  await page.keyboard.press("t");
  await expect(drawer.locator('a[aria-current="location"]')).toHaveText(
    "2. Conservative or Bourgeois Socialism",
  );
});

test("'t' does nothing while typing in a field", async ({ page }) => {
  await page.goto("/search/");
  await page.getByRole("searchbox").or(page.locator("input")).first().fill("t");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("the end-of-chapter card leads through all four chapters, then back to the work", async ({
  page,
}) => {
  await page.goto(CH(1));
  for (const [n, next] of [
    [1, "Chapter II. Proletarians and Communists"],
    [2, "Chapter III. Socialist and Communist Literature"],
    [3, "Chapter IV. Position of the Communists"],
  ] as const) {
    await expect(page).toHaveURL(new RegExp(`ch0${n}\\.htm`));
    const card = page.locator(".end-card");
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("heading")).toHaveText("Chapter finished");
    await expect(card.locator(".end-next-title")).toContainText(next);
    await expect(card.locator(".end-opening")).not.toBeEmpty();
    await card.getByRole("link", { name: "Next chapter →" }).click();
  }
  await expect(page).toHaveURL(/ch04\.htm/);
  const last = page.locator(".end-card");
  await expect(last).toContainText("This is the last chapter");
  await last.getByRole("link", { name: "Back to the work page" }).click();
  await expect(page).toHaveURL(new RegExp(`${WORK}$`));
});

test("previous / next links sit under every chapter", async ({ page }) => {
  await page.goto(CH(2));
  const nav = page.getByRole("navigation", { name: "Chapters" });
  await expect(nav.getByRole("link", { name: /Ch\. I:/ })).toHaveAttribute("href", CH(1));
  await expect(nav.getByRole("link", { name: /Ch\. III:/ })).toHaveAttribute("href", CH(3));
  await expect(nav.getByRole("link", { name: "All chapters" })).toHaveAttribute("href", WORK);
});

test("progress shows the chapter, percent, time left and passage, and moves", async ({ page }) => {
  await page.goto(`${CH(1)}?layers=plain`);
  const label = page.locator(".progress-label");
  await expect(label).toContainText(/^Ch\. I · 0% · about \d+ min left/);
  await expect(label).toContainText("I.1 of 65");
  await page.goto(`${CH(1)}?layers=plain#p00030`);
  await expect(label).toContainText(/Ch\. I · ([1-9]\d?)% /);
  await expect(label).toContainText(/I\.(2[89]|3[0-2]) of 65/);
  const before = await label.innerText();
  // More layers, more words left.
  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(label).not.toHaveText(before);
});

test("finishing a chapter marks it on the work page and the home shelf", async ({ page }) => {
  await page.goto(`${CH(2)}#p00010`);
  await expect(page.locator(".progress-label")).toBeVisible();
  await page.locator(".end-card").scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("plm:reading") ?? "{}").docs))
    .toMatchObject({ [CH(2)]: { finished: true } });

  await page.goto(WORK);
  const ch2 = page.locator(".chapter-list > li").nth(1);
  await expect(ch2.locator(".read-mark")).toHaveText("Finished");
  await ch2.getByRole("button", { name: "Mark unread" }).click();
  await expect(ch2.locator(".read-mark")).toHaveCount(0);

  await page.goto("/");
  const shelf = page.locator(".shelf");
  await expect(shelf.locator("li")).toHaveCount(1);
  await expect(shelf.locator("li a")).toContainText("Chapter II. Proletarians and Communists");
  await shelf.getByRole("button", { name: /Remove/ }).click();
  await expect(shelf).toHaveCount(0);
});

test("the work page offers to continue where the reader left off", async ({ page }) => {
  await page.goto(`${CH(3)}#p00041`);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("plm:reading") ?? ""))
    .toContain("p000");
  await page.goto(WORK);
  const go = page.locator(".work-actions a");
  await expect(go).toHaveText("Continue reading");
  await expect(go).toHaveAttribute("href", new RegExp(`ch03\\.htm#p\\d{5}$`));
});

test("a position saved before task 031 still offers 'Continue where you left off'", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, '"p00030"'), `plm:progress:${CH(1)}`);
  await page.goto(CH(1));
  await expect(page.locator(".resume a")).toHaveAttribute("href", "#p00030");
});

test("copy link to passage writes the canonical passage URL", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${CH(1)}?layers=plain,original#p00017`);
  // Since task 031 D the link is one of the passage actions (the ⋯ button).
  await page.locator("#p00017 button.row-actions").click();
  await page
    .getByRole("toolbar", { name: "Passage actions" })
    .getByRole("button", { name: "Copy link" })
    .click();
  await expect(page.locator(".toast")).toContainText("copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${new URL(page.url()).origin}${CH(1)}#p00017`,
  );
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the work page and the chapter contents work as plain links", async ({ page }) => {
    await page.goto(WORK);
    await expect(page.locator(".chapter-list > li")).toHaveCount(4);
    await expect(page.locator(".work-actions a")).toHaveAttribute("href", CH(1));

    await page.goto(CH(3));
    await expect(page.locator(".toc-button")).toBeHidden();
    await expect(page.locator(".reader-progress")).toBeHidden();
    await page.locator(".toc-inline summary").click();
    const toc = page.locator(".toc-inline nav");
    await expect(
      toc.getByRole("link", { name: "Chapter I. Bourgeois and Proletarians" }),
    ).toHaveAttribute("href", CH(1));
    await expect(toc.getByRole("link", { name: "A. Feudal Socialism" })).toHaveAttribute(
      "href",
      "#p00003",
    );
    await expect(page.locator(".end-card a.start-reading")).toHaveAttribute("href", CH(4));
  });
});

test("the reader bar does not grow after loading, so the text does not jump", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { early: number }).early =
        document.querySelector(".reader-bar")?.getBoundingClientRect().height ?? 0;
    });
  });
  await page.goto(`${CH(1)}?layers=plain,original#p00009`);
  await expect(page.locator(".progress-label")).toContainText("%");
  const [early, late] = await page.evaluate(() => [
    (window as unknown as { early: number }).early,
    document.querySelector(".reader-bar")?.getBoundingClientRect().height ?? 0,
  ]);
  expect(Math.abs(late - early)).toBeLessThan(2);
});
