// Task 031, Part E: read aloud. Headless browsers cannot speak, so a stand-in
// speech engine records each utterance and "finishes" it after a short delay.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WORK = "/archive/marx/works/1848/communist-manifesto/";
const DOC = `${WORK}ch01.htm`;

type Spoken = { text: string; rate: number; voice: string | undefined };

async function fakeSpeech(page: Page, delay = 30) {
  await page.addInitScript((ms) => {
    const w = window as unknown as Record<string, unknown>;
    const spoken: Spoken[] = [];
    w["__spoken"] = spoken;
    w["__ttsDelay"] = ms;
    const voices = [
      {
        name: "Local English",
        lang: "en-GB",
        localService: true,
        voiceURI: "local",
        default: true,
      },
      {
        name: "Cloud English",
        lang: "en-US",
        localService: false,
        voiceURI: "cloud",
        default: false,
      },
      { name: "Lokal Deutsch", lang: "de-DE", localService: true, voiceURI: "de", default: false },
    ];
    type U = {
      text: string;
      rate: number;
      voice?: { name: string };
      onend?: () => void;
      onerror?: (e: { error: string }) => void;
    };
    let current: U | null = null;
    let timer: number | undefined;
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => voices,
      speak(u: U) {
        current = u;
        spoken.push({ text: u.text, rate: u.rate, voice: u.voice?.name });
        timer = window.setTimeout(() => {
          if (current !== u) return;
          current = null;
          u.onend?.();
        }, w["__ttsDelay"] as number);
      },
      cancel() {
        window.clearTimeout(timer);
        const u = current;
        current = null;
        u?.onerror?.({ error: "interrupted" });
      },
      pause() {},
      resume() {},
    });
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    w["SpeechSynthesisUtterance"] = class {
      text: string;
      rate = 1;
      lang = "";
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    };
  }, delay);
}

const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken);
const player = (page: Page) => page.getByRole("region", { name: "Read aloud" });

/** Play starts at the first passage in view: wait until the deep link has scrolled there. */
const settled = (page: Page, id: string) =>
  expect
    .poll(() =>
      // Near the top AND no longer moving: a smooth scroll passes the line on its way.
      page.locator(`#${id}`).evaluate(async (el) => {
        const a = el.getBoundingClientRect().top;
        await new Promise((r) => setTimeout(r, 150));
        const b = el.getBoundingClientRect().top;
        return Math.abs(a - b) < 1 && b < 220;
      }),
    )
    .toBe(true);

test("the player is hidden where the browser cannot speak", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }),
  );
  await page.goto(DOC);
  await expect(page.locator(".layer-switch")).toBeVisible();
  await expect(page.getByRole("button", { name: "Listen" })).toHaveCount(0);
});

test("reads Plain English a sentence at a time, following along", async ({ page }) => {
  // Slow enough that the first sentence is still being "read" when checked, even under load.
  await fakeSpeech(page, 1500);
  await page.goto(`${DOC}?layers=plain#p00009`);
  await settled(page, "p00009");
  await page.getByRole("button", { name: "Listen" }).click();
  await expect(player(page).getByLabel("Read")).toHaveValue("plain");
  expect(
    await new AxeBuilder({ page })
      .include("#listen-player")
      .analyze()
      .then((r) =>
        r.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => v.id),
      ),
  ).toEqual([]);
  await player(page).getByRole("button", { name: "Play" }).click();
  await expect
    .poll(async () => (await spoken(page))[0]?.text)
    .toBe("The history of all society up to now is the history of class struggles.");
  // The passage is marked and the sentence highlighted.
  await expect(page.locator(".row[data-reading]")).toHaveAttribute("id", "p00009");
  expect(
    await page.evaluate(
      () =>
        (CSS as unknown as { highlights: Map<string, { size: number }> }).highlights.get(
          "tts-sentence",
        )?.size,
    ),
  ).toBe(1);
  // It goes on by itself, and Pause stops it.
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(1);
  await player(page).getByRole("button", { name: "Pause" }).click();
  const count = (await spoken(page)).length;
  await page.waitForTimeout(2000);
  expect((await spoken(page)).length).toBe(count);
  await expect(player(page).getByRole("button", { name: "Play" })).toBeVisible();
});

test("the reader chooses the layer, and layers are never mixed", async ({ page }) => {
  await fakeSpeech(page);
  await page.goto(`${DOC}?layers=plain,original#p00009`);
  await settled(page, "p00009");
  await page.getByRole("button", { name: "Listen" }).click();
  await player(page).getByLabel("Read").selectOption("original");
  await player(page).getByRole("button", { name: "Play" }).click();
  await expect
    .poll(async () => (await spoken(page))[0]?.text)
    .toBe("The history of all hitherto existing society is the history of class struggles.");
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(4);
  const texts = (await spoken(page)).map((s) => s.text).join(" ");
  expect(texts).not.toContain("up to now");
});

test("an untranslated passage is skipped in Plain English, not read in the Original", async ({
  page,
}) => {
  await fakeSpeech(page);
  // In the fixture, the chapter heading (p00008) has no Plain English; p00009 has.
  await page.goto(`${DOC}?layers=plain#p00008`);
  await expect(page.locator("#p00008")).toHaveClass(/untranslated/);
  await page.locator("#p00008 button.row-actions").click();
  await page.getByRole("button", { name: "Listen from here" }).click();
  await expect
    .poll(async () => (await spoken(page))[0]?.text)
    .toBe("The history of all society up to now is the history of class struggles.");
  expect((await spoken(page)).map((s) => s.text).join(" ")).not.toContain(
    "Bourgeois and Proletarians",
  );
});

test("previous/next passage, speed and voice", async ({ page }) => {
  await fakeSpeech(page, 2000);
  await page.goto(`${DOC}?layers=plain#p00009`);
  await settled(page, "p00009");
  await page.getByRole("button", { name: "Listen" }).click();
  const voice = player(page).getByLabel("Voice");
  // English first, voices on this device first, online voices labelled.
  await expect(voice.locator("option")).toHaveText([
    "Local English (en-GB)",
    "Cloud English (en-US) · online voice",
    "Lokal Deutsch (de-DE)",
  ]);
  await expect(player(page).locator(".listen-note")).toHaveCount(0);
  await voice.selectOption("Cloud English");
  await expect(player(page).locator(".listen-note")).toContainText("online voice");
  await player(page).getByLabel("Speed").selectOption("1.5");

  await player(page).getByRole("button", { name: "Play" }).click();
  await expect
    .poll(async () => (await spoken(page)).at(-1))
    .toMatchObject({ rate: 1.5, voice: "Cloud English" });
  const before = await page.locator(".row[data-reading]").getAttribute("id");
  await player(page).getByRole("button", { name: "Next passage" }).click();
  await expect(page.locator(".row[data-reading]")).not.toHaveAttribute("id", before ?? "");
  await player(page).getByRole("button", { name: "Previous passage" }).click();
  await expect(page.locator(".row[data-reading]")).toHaveAttribute("id", before ?? "");

  // Saved for next time.
  await page.reload();
  await page.getByRole("button", { name: "Listen" }).click();
  await expect(player(page).getByLabel("Speed")).toHaveValue("1.5");
  await expect(player(page).getByLabel("Voice")).toHaveValue("Cloud English");
});

test("'Continue to next chapter' carries on into the next chapter", async ({ page }) => {
  await fakeSpeech(page, 10);
  await page.goto(`${WORK}ch03.htm?layers=original#p00069`);
  await page.getByRole("button", { name: "Listen" }).click();
  await player(page).getByLabel("Continue to next chapter").check();
  await page.locator("#p00069 button.row-actions").click();
  await page.getByRole("button", { name: "Listen from here" }).click();
  await expect(page).toHaveURL(/ch04\.htm/);
  await expect(player(page)).toBeVisible();
  await expect(player(page).getByLabel("Read")).toHaveValue("original");
  await expect.poll(async () => (await spoken(page))[0]?.text ?? "").toMatch(/^Chapter IV/);
});

test("without 'Continue', reading stops at the end of the chapter", async ({ page }) => {
  await fakeSpeech(page, 10);
  await page.goto(`${WORK}ch04.htm?layers=original#p00014`);
  await page.locator("#p00014 button.row-actions").click();
  await page.getByRole("button", { name: "Listen from here" }).click();
  await expect(player(page).locator(".listen-status")).toHaveText("End of chapter.");
  await expect(page).toHaveURL(/ch04\.htm/);
});
