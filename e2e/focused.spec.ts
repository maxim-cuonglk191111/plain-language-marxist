// Task 031, Part C: focus mode, reading aids, keep screen on, keyboard shortcuts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const DOC = `${WORK}ch01.htm`;

const withPrefs = (page: Page, prefs: object) =>
  page.addInitScript((p) => localStorage.setItem("plm:prefs", JSON.stringify(p)), prefs);
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
const ready = (page: Page) =>
  expect(page.locator(".row-actions:not([hidden])").first()).toBeAttached();

test("focus mode hides the page around the text but keeps the reader bar", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain`);
  const toggle = page.getByRole("button", { name: "Focus mode" });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-focus", "on");
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".reader-header h1")).toBeHidden();
  await expect(page.locator(".ai-note")).toBeVisible(); // the AI-assisted notice stays
  await expect(page.locator(".layer-switch")).toBeVisible();
  const exit = page.getByRole("button", { name: "Exit focus mode" });
  await expect(exit).toHaveAttribute("aria-pressed", "true");
  expect(await serious(page)).toEqual([]);

  // Remembered on the next chapter, applied before the body exists.
  await page.goto(`${WORK}ch02.htm`);
  await expect(page.locator(".site-header")).toBeHidden();
  // The keyboard way back.
  await exit.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".site-header")).toBeVisible();
});

test("paragraph focus dims every passage but the one being read", async ({ page }) => {
  await withPrefs(page, { aid: "paragraph" });
  await page.goto(`${DOC}?layers=plain#p00011`);
  await expect(page.locator(".rows > .row[data-current]")).toHaveCount(1);
  const dim = await page
    .locator(".rows > .row:not([data-current])")
    .first()
    .evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(dim).toBeLessThan(0.5);
  // It fades in over 0.2s.
  await expect
    .poll(() =>
      page.locator(".row[data-current]").evaluate((el) => Number(getComputedStyle(el).opacity)),
    )
    .toBe(1);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("paragraph focus does not animate", async ({ page }) => {
    await withPrefs(page, { aid: "paragraph" });
    await page.goto(DOC);
    expect(
      await page
        .locator(".rows > .row")
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0s");
  });
});

test("the reading ruler follows the mouse and never blocks clicks", async ({ page }) => {
  await withPrefs(page, { aid: "ruler" });
  await page.goto(`${DOC}?layers=plain#p00011`);
  const ruler = page.locator(".reading-ruler");
  await expect(ruler).toBeAttached();
  expect(await ruler.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const top = async () => (await ruler.boundingBox())?.y ?? 0;
  await page.mouse.move(600, 600);
  const at600 = await top();
  await page.mouse.move(600, 300);
  expect(at600 - (await top())).toBeCloseTo(300, -1);
});

test("keep screen on takes a wake lock and lets it go", async ({ page }) => {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __lock: string[] }).__lock = log;
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          log.push("request");
          return { release: async () => void log.push("release") };
        },
      },
    });
  });
  await page.goto(DOC);
  await page.getByRole("button", { name: "Settings" }).click();
  const group = page.getByRole("group", { name: "Keep screen on" });
  await group.getByLabel("On").check();
  const log = () => page.evaluate(() => (window as unknown as { __lock: string[] }).__lock);
  await expect.poll(log).toEqual(["request"]);
  await group.getByLabel("Off").check();
  await expect.poll(log).toEqual(["request", "release"]);
});

test("'Keep screen on' is not offered where the browser cannot do it", async ({ page }) => {
  await page.addInitScript(() => {
    delete (Navigator.prototype as unknown as { wakeLock?: unknown }).wakeLock;
  });
  await page.goto(DOC);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("group", { name: "Keep screen on" })).toHaveCount(0);
});

test("keyboard shortcuts: ? lists them, and they work", async ({ page }) => {
  await page.goto(`${WORK}ch02.htm?layers=plain#p00010`);
  await ready(page);

  await page.keyboard.press("?");
  const list = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(list).toContainText("Next / previous passage");
  expect(await serious(page)).toEqual([]);
  await page.keyboard.press("Escape");

  // j moves to the next passage.
  const at = () => page.locator(".progress-label .progress-passage").innerText();
  const before = await at();
  await page.keyboard.press("j");
  await expect.poll(at).not.toBe(before);

  await page.keyboard.press("s");
  await expect(page.locator("#reader-settings")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("f");
  await expect(page.locator("html")).toHaveAttribute("data-focus", "on");
  await page.keyboard.press("f");
  await expect(page.locator("html")).toHaveAttribute("data-focus", "off");

  await page.keyboard.press("b");
  await expect(page.locator(".rows > .row[data-bookmarked]")).toHaveCount(1);

  await page.keyboard.press("]");
  await expect(page).toHaveURL(/ch03\.htm/);
  await ready(page);
  await page.keyboard.press("[");
  await expect(page).toHaveURL(/ch02\.htm/);
  await ready(page);
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search\/$/);
});

test("shortcuts can be switched off, and never fire while typing", async ({ page }) => {
  await page.goto("/search/");
  await page.locator("input").first().fill("tfs?");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("#reader-settings")).toHaveCount(0);

  await withPrefs(page, { shortcuts: "off" });
  await page.goto(DOC);
  await ready(page);
  for (const key of ["?", "t", "f", "s"]) await page.keyboard.press(key);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-focus", "off");
  await expect(page.locator("#reader-settings")).toHaveCount(0);
});

test("nothing is requested from anywhere but the site itself", async ({ page, baseURL }) => {
  const site = new URL(baseURL ?? "http://127.0.0.1:4174").host;
  const outside: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.host !== site) outside.push(r.url());
  });
  await withPrefs(page, { font: "atkinson", aid: "ruler", theme: "sepia" });
  await page.goto(`${DOC}?layers=plain,original,context#p00013`);
  await ready(page);
  await page.getByRole("button", { name: "Contents" }).click();
  await page.keyboard.press("Escape");
  await page.locator("#p00013 button.row-actions").click();
  await page.getByRole("button", { name: "Highlight Blue" }).click();
  await page.goto(WORK);
  await page.goto("/notes/");
  await page.goto("/search/?q=class");
  await page.waitForLoadState("networkidle");
  expect(outside).toEqual([]);
});
