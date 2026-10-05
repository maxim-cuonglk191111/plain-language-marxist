// About (editorial principles) and FAQ pages (task 020): static, linked from the footer, accessible.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  {
    path: "/about/",
    link: "About",
    heading: "About this project",
    sections: ["layers", "argument", "original", "terms", "ai", "review", "rights", "privacy"],
  },
  {
    path: "/faq/",
    link: "FAQ",
    heading: "Frequently asked questions",
    sections: [
      "dumbing-down",
      "translation",
      "terms",
      "ai",
      "done-before",
      "neutral",
      "mia",
      "cite",
      "mistake",
    ],
  },
] as const;

for (const js of [true, false]) {
  test.describe(js ? "with JavaScript" : "without JavaScript", () => {
    test.use({ javaScriptEnabled: js });
    for (const p of PAGES) {
      test(`${p.link} renders every section`, async ({ page }) => {
        await page.goto(p.path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.heading);
        for (const id of p.sections) {
          await expect(page.locator(`h2#${id}`)).toBeVisible();
        }
      });

      test(`${p.link} is linked from the footer`, async ({ page }) => {
        await page.goto("/archive/marx/works/1848/communist-manifesto/ch01.htm");
        const link = page.locator(".site-footer").getByRole("link", { name: p.link, exact: true });
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${p.path}$`));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.heading);
      });
    }
  });
}

test("the FAQ question list links to each answer", async ({ page }) => {
  await page.goto("/faq/");
  const toc = page.getByRole("navigation", { name: "Questions" });
  await toc.getByRole("link", { name: /translation of a translation/ }).click();
  await expect(page).toHaveURL(/#translation$/);
  await expect(page.locator("h2#translation")).toBeInViewport();
});

test("the header nav is unchanged", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Site" });
  await expect(nav.getByRole("link", { name: "About" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "FAQ" })).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });
    for (const p of PAGES) {
      test(`${p.link} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(p.path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      });
    }
  });
}
