// Task 031, Parts B and F: reading settings, themes, fonts, and telling stacked layers apart.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

/** Saves prefs before any page script runs, as a returning reader would have them. */
const withPrefs = (page: Page, prefs: object) =>
  page.addInitScript((p) => localStorage.setItem("plm:prefs", JSON.stringify(p)), prefs);

const serious = async (page: Page) =>
  (
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
  ).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);

for (const theme of ["light", "sepia", "dark", "black"] as const) {
  test(`the ${theme} theme passes axe with two layers and the settings open`, async ({ page }) => {
    await withPrefs(page, { theme });
    await page.goto(`${DOC}?layers=plain,original#p00013`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await serious(page)).toEqual([]);
    await page.getByRole("button", { name: "Settings" }).click();
    expect(await serious(page)).toEqual([]);
  });
}

test("saved prefs are on <html> before the body exists (no flash)", async ({ page }) => {
  await withPrefs(page, { theme: "sepia", font: "atkinson", size: 22, leading: "loose" });
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (!document.body) return;
      const d = document.documentElement;
      (window as unknown as { atBody: object }).atBody = {
        theme: d.dataset["theme"],
        font: d.dataset["font"],
        leading: d.dataset["leading"],
        size: d.style.getPropertyValue("--text-size"),
      };
      obs.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(DOC);
  expect(await page.evaluate(() => (window as unknown as { atBody: object }).atBody)).toEqual({
    theme: "sepia",
    font: "atkinson",
    leading: "loose",
    size: "22",
  });
});

test("an old named size migrates to the nearest pixel size", async ({ page }) => {
  await withPrefs(page, { size: "xl", leading: "relaxed" });
  await page.goto(DOC);
  const px = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  expect(px).toBeCloseTo(21, 0);
});

test("settings change the page, survive reload, and reset", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain`);
  await page.getByRole("button", { name: "Settings" }).click();
  const panel = page.getByRole("region", { name: "Reading settings" });
  await expect(panel.getByRole("group", { name: "Preview" })).toBeVisible();

  await panel.getByLabel("Sepia").check();
  await panel.getByLabel("Book serif").check();
  await panel.getByLabel("Narrow").check();
  await panel.getByLabel("Book style").check();
  await panel.getByLabel("Justified").check();
  await panel.getByLabel("Text size").fill("24");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "sepia");
  await expect(html).toHaveAttribute("data-para", "indented");
  const plain = page.locator("#p00013 .layer-plain p.block").first();
  expect(await plain.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Palatino");
  expect(await plain.evaluate((el) => getComputedStyle(el).textAlign)).toBe("justify");
  expect(await plain.evaluate((el) => getComputedStyle(el).textIndent)).not.toBe("0px");
  // The Original keeps its own face whatever the Plain English font.
  expect(
    await page.locator("#p00013 .layer-original").evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Palatino");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "sepia");
  await expect(html).toHaveAttribute("data-width", "narrow");
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBe(24);

  await page.getByRole("button", { name: "Settings" }).click();
  await panel.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(html).not.toHaveAttribute("data-theme");
  await expect(html).toHaveAttribute("data-font", "sans");
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBe(17);
});

test("a font is downloaded only when it is chosen", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/fonts/")) fonts.push(r.url());
  });
  await page.goto(DOC);
  await page.waitForLoadState("networkidle");
  expect(fonts).toEqual([]);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("OpenDyslexic").check();
  await expect.poll(() => fonts.some((u) => u.includes("OpenDyslexic-Regular"))).toBe(true);
  expect(fonts.some((u) => u.includes("atkinson"))).toBe(false);
});

test("reading speed changes the time left", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain`);
  const minutes = async () =>
    Number(/about (\d+) min/.exec(await page.locator(".progress-label").innerText())?.[1]);
  const at200 = await minutes();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("150").check();
  await expect.poll(minutes).toBeGreaterThan(at200);
});

test("with storage blocked, the reader still works with defaults", async ({ page }) => {
  await page.addInitScript(() => {
    for (const m of ["getItem", "setItem", "removeItem", "key"] as const)
      Storage.prototype[m] = () => {
        throw new DOMException("blocked", "SecurityError");
      };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(DOC);
  await expect(page.locator(".layer-switch")).toBeVisible();
  await expect(page.locator("#p00009 .layer-plain")).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Dark").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test.describe("Part F: stacked layers", () => {
  const sourceLook = (page: Page, id: string) =>
    page.locator(`#${id} > .col-original`).evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, rule: s.borderLeftWidth };
    });

  test("@mobile the Original gets a quiet tone and rule under Plain English", async ({ page }) => {
    await page.goto(`${DOC}?layers=plain,original#p00013`);
    for (const theme of ["light", "sepia", "dark", "black"]) {
      await page.evaluate(
        (t) => localStorage.setItem("plm:prefs", JSON.stringify({ theme: t })),
        theme,
      );
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const look = await sourceLook(page, "p00013");
      expect(look.bg, theme).not.toBe("rgba(0, 0, 0, 0)");
      expect(look.rule, theme).toBe("2px");
    }
    expect(await serious(page)).toEqual([]);
  });

  test("@mobile with only the Original on, nothing needs telling apart", async ({ page }) => {
    await page.goto(`${DOC}?layers=original#p00013`);
    expect((await sourceLook(page, "p00013")).bg).toBe("rgba(0, 0, 0, 0)");
  });

  test("side by side, the columns keep their plain look", async ({ page }) => {
    await page.goto(`${DOC}?layers=plain,original#p00013`);
    expect((await sourceLook(page, "p00013")).bg).toBe("rgba(0, 0, 0, 0)");
  });
});
