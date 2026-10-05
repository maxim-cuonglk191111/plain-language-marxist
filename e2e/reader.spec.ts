// M1 acceptance, read-only parts (SDD §16.2 steps 1–3), against the built static site.
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

async function inViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight;
  });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  test.info().annotations.push({ type: "console-errors", description: "collected" });
  (page as Page & { errors?: string[] }).errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { errors?: string[] }).errors ?? []).toEqual([]);
});

test("serves the source-shaped .htm URL as HTML", async ({ request }) => {
  const res = await request.get(DOC);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/html");
});

test("the Original keeps the source's block structure and layout", async ({ page }) => {
  await page.goto(`${DOC}?view=original`);
  const original = page.locator(".layer-original");
  await expect(original.locator("h2.heading").first()).toHaveText(
    "Manifesto of the Communist Party",
  );
  await expect(original.locator(".indent-1")).toHaveCount(2); // the two indented "I." and "II." paragraphs
  await expect(original.locator(".footnote")).toHaveCount(4);
  await expect(page.locator(".rows > .row")).toHaveCount(64); // 65 passages, two covered by one rendering
  await expect(page.locator(".layer-plain").first()).toBeHidden();
});

for (const view of ["plain", "original", "parallel"] as const) {
  test(`deep link #p00009 lands on the passage in ${view} mode`, async ({ page }) => {
    await page.goto(`${DOC}?view=${view}#p00009`);
    await expect(page.locator("#p00009")).toBeVisible();
    await expect.poll(() => inViewport(page, "#p00009")).toBe(true);
    expect(await page.evaluate(() => document.querySelector(":target")?.id)).toBe("p00009");
  });
}

test("a deep link to the second passage of a multi-passage rendering reaches its row", async ({
  page,
}) => {
  await page.goto(`${DOC}?view=plain#p00012`);
  await expect.poll(() => inViewport(page, "#p00012")).toBe(true);
  await expect(page.locator("#p00011")).toContainText("Modern capitalist society");
});

test("term cards open from both layers", async ({ page }) => {
  await page.goto(`${DOC}?view=parallel#p00013`);
  await page.locator("#p00013 .layer-plain a.term:not([data-kept])").first().click();
  const card = page.getByRole("dialog");
  await expect(card).toContainText("bourgeoisie");
  await expect(card).toContainText("Why this wording?");
  await expect(card).toContainText("occurrences", { ignoreCase: true });
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();

  await page.locator("#p00013 .layer-original a.term").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("bourgeoisie");
});

test("'Original (1848)' swaps the Plain English wording only", async ({ page }) => {
  await page.goto(`${DOC}?view=parallel#p00013`);
  const plain = page.locator("#p00013 .layer-plain");
  const original = page.locator("#p00013 .layer-original");
  const originalBefore = await original.innerText();
  await expect(plain).toContainText("capitalist class");
  await page.getByRole("button", { name: "Original (1848)" }).click();
  await expect(plain).toContainText("bourgeoisie");
  await expect(plain).not.toContainText("capitalist class");
  expect(await original.innerText()).toBe(originalBefore);
});

test("term cards context the term for newcomers", async ({ page }) => {
  await page.goto(`${DOC}?view=parallel#p00013`);
  await page.locator("#p00013 .layer-original a.term").first().click();
  const card = page.getByRole("dialog");
  await expect(card).toContainText("Common mix-up");
  await expect(card.locator(".term-example blockquote")).toBeVisible();
  // In a card, related terms open nested cards (task 024).
  await expect(card.locator(".term-related a[data-term-link]").first()).toBeVisible();
  await card.getByText("Read more").click();
  await expect(card.locator(".term-more p").first()).toBeVisible();
});

test("kept terms in Plain English open cards and keep their wording", async ({ page }) => {
  await page.goto(`${DOC}?view=plain#p00010`);
  const serf = page.locator('#p00010 .layer-plain a.term[data-term="serf"]');
  await expect(serf).toHaveText("serf");
  await expect(serf).toHaveAttribute("data-kept", "1");
  await page.getByRole("button", { name: "Original (1848)" }).click();
  await expect(serf).toHaveText("serf");
  await serf.click();
  await expect(page.getByRole("dialog")).toContainText("bound to a lord");
});

test("the Context layer shows a section explanation once, at the section's first row", async ({
  page,
}) => {
  await page.goto(`${DOC}?layers=context#p00009`);
  await expect(page.locator("#p00009 .layer-context")).toContainText("About this section");
  await expect(page.locator(".layer-context .section-explanation")).toHaveCount(1);
  await expect(page.locator("#p00013 .layer-context")).toContainText("Background");
});

test("translation notes sit with the Original, not in the Context layer", async ({ page }) => {
  await page.goto(`${DOC}?layers=original#p00009`);
  const note = page.locator("#p00009 .layer-original .text-note");
  await note.locator("summary").click();
  await expect(note).toContainText("That is, all written history");
  await expect(page.locator("#p00009 .layer-context")).not.toContainText(
    "That is, all written history",
  );
});

test("vocabulary and search pages work", async ({ page }) => {
  await page.goto("/vocabulary/bourgeoisie/");
  await expect(page.locator("h1")).toHaveText("bourgeoisie");
  await expect(page.locator(".term-more")).toHaveCount(0); // the full text is shown, not folded
  await expect(page.locator(".term-example a")).toHaveAttribute("href", /ch01\.htm#p\d{5}$/);
  await page.goto("/search/?q=guild-master");
  await expect(page.locator(".search-results .layer-tag").first()).toBeVisible();
});

test("term preferences can be overridden individually and reset to default", async ({ page }) => {
  await page.goto(`${DOC}?view=plain#p00013`);
  const plain = page.locator("#p00013 .layer-plain");
  await expect(plain).toContainText("capitalist class");

  // Open card
  await plain.locator("a.term:not([data-kept])").first().click();
  const card = page.getByRole("dialog");
  await expect(card).toContainText("Alternative wordings (in-text occurrences)");
  await expect(card).toContainText("Choices are saved locally in your browser");

  // Select alternative 'bourgeoisie'
  await card.getByLabel(/^bourgeoisie/).check();
  await expect(plain).toContainText("bourgeoisie");

  // 'Reset term to default' appears and resets it
  const resetBtn = card.getByRole("button", { name: "Reset term to default" });
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();
  await expect(plain).toContainText("capitalist class");
  await expect(resetBtn).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("both layers are readable and term wording is the default", async ({ page }) => {
    await page.goto(DOC);
    await expect(page.locator("#p00009 .layer-original")).toBeVisible();
    await expect(page.locator("#p00009 .layer-plain")).toContainText(
      "The history of all society up to now",
    );
    await expect(page.locator("#p00013 .layer-plain")).toContainText("capitalist class");
    await expect(page.locator(".layer-switch")).toBeHidden();
    await expect(page.locator("#p00009 .layer-context")).toContainText("About this section");
  });
});

test("@mobile the reader and term card work on a phone", async ({ page }) => {
  await page.goto(`${DOC}?view=plain#p00013`);
  await page.locator("#p00013 .layer-plain a.term:not([data-kept])").first().click();
  const card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && Math.round(box.y + box.height)).toBe(viewport?.height); // bottom sheet
});
