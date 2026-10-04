// Task 031, Part D: passage actions, highlights, notes, quoting, the Notes page.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DOC = "/archive/marx/works/1848/communist-manifesto/ch01.htm";
const both = `${DOC}?layers=plain,original`;

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);

/** The reader's scripts are running once the passage buttons are revealed. */
const ready = (page: Page) =>
  expect(page.locator(".row-actions:not([hidden])").first()).toBeAttached();

/** Selects characters [from, to) of the first text node in a layer of a passage. */
async function selectWords(
  page: Page,
  passage: string,
  layer: "plain" | "original",
  from: number,
  to: number,
) {
  await ready(page);
  await page.locator(`#${passage}`).scrollIntoViewIfNeeded();
  await page.evaluate(
    ([id, l, a, b]) => {
      const el = document.querySelector(`#${id} .col-${l} p.block`);
      const node = el && document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
      if (!node) throw new Error("no text");
      const r = document.createRange();
      r.setStart(node, a as number);
      r.setEnd(node, b as number);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
    },
    [passage, layer, from, to] as const,
  );
}

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("plm:annotations") ?? '{"items":[]}').items);

const bar = (page: Page) => page.getByRole("toolbar", { name: "Passage actions" });

test("tapping a passage opens its actions; a passage highlight survives reload", async ({
  page,
}) => {
  await page.goto(`${both}#p00013`);
  await page
    .locator("#p00013 .col-plain p.block")
    .first()
    .click({ position: { x: 20, y: 8 } });
  await expect(bar(page)).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await bar(page).getByRole("button", { name: "Highlight Green" }).click();
  await expect(page.locator("#p00013")).toHaveAttribute("data-mark", "green");
  await page.reload();
  await expect(page.locator("#p00013")).toHaveAttribute("data-mark", "green");

  // Tap again, remove it.
  await page
    .locator("#p00013 .col-original p.block")
    .first()
    .click({ position: { x: 20, y: 8 } });
  await bar(page).getByRole("button", { name: "Remove highlight" }).click();
  await expect(page.locator("#p00013")).not.toHaveAttribute("data-mark");
  expect(await stored(page)).toEqual([]);
});

test("the passage actions work from the keyboard", async ({ page }) => {
  await page.goto(`${both}#p00013`);
  await ready(page); // the buttons work once the reader's scripts are running
  const button = page.locator("#p00013 button.row-actions");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(bar(page)).toBeVisible();
  await expect(bar(page).locator("button").first()).toBeFocused();
  await page.keyboard.press("Enter"); // the first swatch: yellow
  await expect(page.locator("#p00013")).toHaveAttribute("data-mark", "yellow");
  await page.keyboard.press("Escape");
  await expect(bar(page)).toBeHidden();
  await expect(button).toBeFocused();
});

test("bookmarks and notes show on the Notes page, linked back to the passage", async ({ page }) => {
  await page.goto(`${both}#p00013`);
  await page.locator("#p00013 button.row-actions").click();
  await bar(page).getByRole("button", { name: "Bookmark" }).click();
  await expect(page.locator("#p00013")).toHaveAttribute("data-bookmarked", "1");
  await bar(page).getByRole("button", { name: "Note" }).click();
  const dialog = page.getByRole("dialog", { name: "Note" });
  await dialog.getByRole("textbox").fill("Two camps: the core claim.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#p00013")).toHaveAttribute("data-note", "1");

  await page.goto("/notes/");
  await expect(page.locator(".notes-items li")).toHaveCount(2);
  await expect(page.locator(".note-text")).toHaveText("Two camps: the core claim.");
  await page.getByLabel("Bookmarks").check();
  await expect(page.locator(".notes-items li")).toHaveCount(1);
  await expect(page.locator(".notes-items a")).toHaveAttribute("href", `${DOC}#p00013`);
  expect(await serious(page)).toEqual([]);
});

test("pre-031 bookmarks appear under Notes, once", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((path) => {
    localStorage.setItem(
      "plm:bookmarks",
      JSON.stringify([
        { path, title: "Manifesto: Ch. 1", passage: "p00009", snippet: "The history" },
      ]),
    );
  }, DOC);
  await page.goto("/bookmarks/");
  await expect(page.locator(".notes-items li")).toHaveCount(1);
  await expect(page.locator(".notes-items blockquote")).toHaveText("The history");
  await page.goto(`${both}#p00009`);
  await expect(page.locator("#p00009")).toHaveAttribute("data-bookmarked", "1");
});

test("a text highlight can be made, recoloured and deleted, and survives reload", async ({
  page,
}) => {
  await page.goto(`${both}#p00009`);
  await selectWords(page, "p00009", "plain", 4, 11); // "history"
  const toolbar = page.getByRole("toolbar", { name: "Selected words" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "Highlight Pink" }).click();
  const size = (name: string) =>
    page.evaluate(
      (n) =>
        (CSS as unknown as { highlights: Map<string, { size: number }> }).highlights.get(n)?.size ??
        0,
      name,
    );
  await expect.poll(() => size("hl-pink")).toBe(1);
  expect((await stored(page))[0]).toMatchObject({
    scope: "text",
    layer: "plain",
    quote: { exact: "history" },
  });

  await page.reload();
  await expect.poll(() => size("hl-pink")).toBe(1);
  // Switching to "Original terms" changes the wording, not the highlight.
  await page.getByRole("button", { name: "Original terms" }).click();
  await expect.poll(() => size("hl-pink")).toBe(1);

  // Click on it to edit (after a reload the page is at the top: scroll to it first).
  await page.locator("#p00009").scrollIntoViewIfNeeded();
  const box = await page.evaluate(() => {
    const r = (CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights
      .get("hl-pink")
      ?.values()
      .next().value as Range;
    const b = r.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  const edit = page.getByRole("toolbar", { name: "Highlight" });
  await edit.getByRole("button", { name: "Highlight Blue" }).click();
  await expect.poll(() => size("hl-blue")).toBe(1);
  await page.mouse.click(box.x, box.y);
  await edit.getByRole("button", { name: "Delete" }).click();
  await expect.poll(() => size("hl-blue")).toBe(0);
  expect(await stored(page)).toEqual([]);
});

test("'h' highlights the selected words", async ({ page }) => {
  await page.goto(`${both}#p00009`);
  await selectWords(page, "p00009", "original", 4, 11);
  await page.keyboard.press("h");
  await expect.poll(async () => (await stored(page)).length).toBe(1);
  expect((await stored(page))[0]).toMatchObject({ layer: "original", color: "yellow" });
});

test("a highlight whose words changed is kept and shown as not placed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((path) => {
    const item = {
      id: "gone",
      kind: "mark",
      scope: "text",
      path,
      title: "Chapter I. Bourgeois and Proletarians",
      work: "Manifesto of the Communist Party",
      passage: "p00009",
      layer: "plain",
      quote: { exact: "words that are no longer there", prefix: "", suffix: "", start: 3 },
      color: "yellow",
      snippet: "words that are no longer there",
      created: 1,
      updated: 1,
    };
    localStorage.setItem("plm:annotations", JSON.stringify({ v: 1, items: [item] }));
  }, DOC);
  await page.goto(`${both}#p00009`);
  await expect.poll(async () => (await stored(page))[0]?.orphaned).toBe(true);
  await page.goto("/notes/");
  await expect(page.locator(".notes-items li")).toContainText(
    "Text changed — highlight could not be placed",
  );
  await expect(page.locator(".notes-items blockquote")).toHaveText(
    "words that are no longer there",
  );
});

test("export to JSON, clear storage, import: everything comes back", async ({ page }) => {
  await page.goto(`${both}#p00013`);
  await page.locator("#p00013 button.row-actions").click();
  await bar(page).getByRole("button", { name: "Highlight Blue" }).click();
  await bar(page).getByRole("button", { name: "Bookmark" }).click();
  const before = await stored(page);

  await page.goto("/notes/");
  const [md] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export as Markdown" }).click(),
  ]);
  expect(md.suggestedFilename()).toBe("plm-notes.md");
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export as JSON" }).click(),
  ]);
  const file = await json.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".notes-items li")).toHaveCount(0);
  await page.locator('.file-button input[type="file"]').setInputFiles(file);
  await expect(page.locator(".notes-backup [role=status]")).toContainText("2 new");
  expect(await stored(page)).toEqual(before);
});

test("copy with source labels each layer honestly", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const clip = () => page.evaluate(() => navigator.clipboard.readText());

  await page.goto(`${both}#p00009`);
  await selectWords(page, "p00009", "plain", 4, 11);
  await page
    .getByRole("toolbar", { name: "Selected words" })
    .getByRole("button", { name: "Copy with source" })
    .click();
  expect((await clip()).replace(/\r/g, "")).toBe(
    `“history”\n— Plain English version by Plain Language Marxist, not the original wording. Based on Marx & Engels, Manifesto of the Communist Party (1848), I.9. ${new URL(page.url()).origin}${DOC}#p00009`,
  );

  await page.locator("#p00009 button.row-actions").click();
  await bar(page).getByRole("button", { name: "Copy Original" }).click();
  const original = (await clip()).replace(/\r/g, "");
  expect(original).toMatch(/^“The history of all hitherto existing society/);
  expect(original).toContain(
    "— Marx & Engels, Manifesto of the Communist Party (1848), I.9, trans. Samuel Moore (1888). Original text.",
  );
});

test("Compare shows one passage in every layer, labelled", async ({ page }) => {
  await page.goto(`${DOC}?layers=plain#p00009`);
  await page.locator("#p00009 button.row-actions").click();
  await bar(page).getByRole("button", { name: "Compare" }).click();
  const sheet = page.getByRole("dialog", { name: /Compare Manifesto I\.9$/ });
  await expect(sheet.getByRole("heading", { name: "Plain English" })).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Original" })).toBeVisible();
  await expect(sheet).toContainText("The history of all hitherto existing society");
  await expect(sheet.getByRole("heading", { name: "Context" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
