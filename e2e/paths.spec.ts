// Task 032 C: reading paths. The fixture has two paths (content/collections/):
// "manifesto-core-argument" (Chapters I, II and IV) and "whole-manifesto" (the work).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const CH = (n: number) => `${WORK}ch0${n}.htm`;
const CORE = "/paths/manifesto-core-argument/";
const WHOLE = "/paths/whole-manifesto/";

const serious = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
};

const ticks = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("plm:paths") ?? "null"));

test("home and the site nav link the paths; the listing shows each one", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Paths" }),
  ).toHaveAttribute("href", "/paths/");
  const section = page.locator("section", { hasText: "Suggested reading paths" });
  await expect(
    section.getByRole("link", { name: "The Manifesto's core argument" }),
  ).toHaveAttribute("href", CORE);

  await page.goto("/paths/");
  await expect(page.locator("h1")).toHaveText("Reading paths");
  await expect(page.locator(".lede")).toContainText("suggestions, not the correct way");
  await expect(page.locator(".path-list > li")).toHaveCount(2);
  await expect(page.locator(".path-list > li").first()).toContainText(/3 steps · about \d+ min/);
  expect(await serious(page)).toEqual([]);
});

test("a path page shows the rationale and the steps, labelled as a suggestion", async ({
  page,
}) => {
  await page.goto(CORE);
  await expect(page.locator(".path-label")).toHaveText("A suggested reading order");
  await expect(page.locator("h1")).toHaveText("The Manifesto's core argument");
  await expect(page.locator(".lede")).toHaveText(
    "Three of the four chapters, for a first reading.",
  );
  await expect(page.locator(".path-rationale")).toContainText("Who suggests this order, and why");
  await expect(page.locator(".path-rationale")).toContainText("Chapter III");
  expect(await page.locator("main").innerText()).not.toMatch(/correct order|day \d|streak/i);

  const steps = page.locator(".path-steps > li");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0).locator("a")).toHaveAttribute("href", CH(1));
  await expect(steps.nth(1).locator("a")).toHaveAttribute("href", CH(2));
  await expect(steps.nth(2).locator("a")).toHaveAttribute("href", CH(4));
  await expect(steps.nth(0)).toContainText(/Chapter I\. Bourgeois and Proletarians/);
  await expect(steps.nth(0)).toContainText(/about \d+ min/);
  await expect(page.locator(".path-actions a")).toHaveText("Start this path");
  await expect(page.locator(".path-actions a")).toHaveAttribute("href", CH(1));
  await expect(page.locator(".path-count")).toHaveText("0 of 3 chapters read");

  // Other paths are listed when there are several.
  const others = page.locator("section", { hasText: "Other suggested paths" });
  await expect(others.getByRole("link")).toHaveText(["The whole Manifesto, in order"]);
  expect(await serious(page)).toEqual([]);
});

test("a work step expands to its chapters", async ({ page }) => {
  await page.goto(WHOLE);
  const step = page.locator(".path-steps > li");
  await expect(step).toHaveCount(1);
  await expect(step.locator("> .path-row a")).toHaveAttribute("href", WORK);
  await expect(step).toContainText("the whole work, 4 chapters");
  await expect(step.locator(".path-chapters > li")).toHaveCount(4);
  await expect(step.getByRole("checkbox")).toHaveCount(4);
});

test("progress comes from finished chapters; ticks and Continue follow the reader", async ({
  page,
}) => {
  // Finish Chapter I in the reader.
  await page.goto(`${CH(1)}#p00060`);
  await expect(page.locator(".progress-label")).toBeVisible();
  await page.locator(".end-card").scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("plm:reading") ?? "{}").docs))
    .toMatchObject({ [CH(1)]: { finished: true } });

  await page.goto(CORE);
  const box = (name: RegExp) => page.getByRole("checkbox", { name });
  await expect(box(/Read: Chapter I\. /)).toBeChecked();
  await expect(box(/Read: Chapter II\. /)).not.toBeChecked();
  await expect(page.locator(".path-count")).toHaveText("1 of 3 chapters read");
  const go = page.locator(".path-actions a");
  await expect(go).toHaveText("Continue this path");
  await expect(go).toHaveAttribute("href", CH(2));
  // Nothing is stored for the path until the reader ticks something by hand.
  expect(await ticks(page)).toBeNull();

  // Tick Chapter II by hand: Continue moves on to Chapter IV.
  await box(/Read: Chapter II\. /).check();
  await expect(go).toHaveAttribute("href", CH(4));
  await expect(page.locator(".path-count")).toHaveText("2 of 3 chapters read");
  expect(await ticks(page)).toEqual({
    v: 1,
    paths: { "manifesto-core-argument": { [CH(2)]: true } },
  });

  // Untick Chapter I although the reader finished it: Continue goes back to it.
  await box(/Read: Chapter I\. /).uncheck();
  await expect(go).toHaveAttribute("href", CH(1));
  await page.reload();
  await expect(box(/Read: Chapter I\. /)).not.toBeChecked();
  await expect(box(/Read: Chapter II\. /)).toBeChecked();

  // The other path is not affected by those ticks.
  await page.goto(WHOLE);
  await expect(box(/Read: Chapter I\. /)).toBeChecked();
  await expect(box(/Read: Chapter II\. /)).not.toBeChecked();
  expect(await serious(page)).toEqual([]);
});

test("every step read: the path says so", async ({ page }) => {
  await page.goto(CORE);
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await expect(page.locator(".path-actions")).toContainText("You have read every step");
  await expect(page.locator(".path-count")).toHaveText("3 of 3 chapters read");
});

test("stored garbage in plm:paths does not break the page", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("plm:paths", '{"v":1,"paths":[1,2]}'));
  await page.goto(CORE);
  await expect(page.locator(".path-count")).toHaveText("0 of 3 chapters read");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the path page is a plain list of links", async ({ page }) => {
    await page.goto(CORE);
    await expect(page.locator(".path-label")).toHaveText("A suggested reading order");
    await expect(page.locator(".path-steps > li a")).toHaveCount(3);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.locator(".path-count")).toHaveCount(0);
    await expect(page.locator(".path-actions a")).toHaveText("Start this path");
    await expect(page.locator(".path-actions a")).toHaveAttribute("href", CH(1));
  });
});
