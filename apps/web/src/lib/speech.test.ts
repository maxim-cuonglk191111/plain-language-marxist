import { describe, expect, it } from "vitest";
import { normalizeListen, orderVoices, pickVoice, sentences, voiceLabel } from "./speech";

const cut = (text: string) => sentences(text).map((s) => text.slice(s.start, s.end));

describe("sentences", () => {
  it("splits running text into trimmed sentences", () => {
    expect(
      cut("A spectre is haunting Europe. All the powers have joined!  Where is the party? "),
    ).toEqual([
      "A spectre is haunting Europe.",
      "All the powers have joined!",
      "Where is the party?",
    ]);
  });

  it("drops pieces with no words, and keeps text without a full stop", () => {
    expect(cut("  — ")).toEqual([]);
    expect(cut("Working Men of All Countries, Unite")).toEqual([
      "Working Men of All Countries, Unite",
    ]);
  });
});

describe("voices", () => {
  const voices = [
    { name: "Zira", lang: "en-US", localService: true },
    { name: "Google Deutsch", lang: "de-DE", localService: false },
    { name: "Google UK English", lang: "en-GB", localService: false },
    { name: "Anna", lang: "de-DE", localService: true },
    { name: "David", lang: "en-US", localService: true },
  ];

  it("puts English first, and voices on this device before online ones", () => {
    expect(orderVoices(voices).map((v) => v.name)).toEqual([
      "David",
      "Zira",
      "Google UK English",
      "Anna",
      "Google Deutsch",
    ]);
  });

  it("keeps a saved voice if it still exists, otherwise the best local English one", () => {
    expect(pickVoice(voices, "Google UK English")?.name).toBe("Google UK English");
    expect(pickVoice(voices, "Gone")?.name).toBe("David");
    expect(pickVoice([], "")).toBeUndefined();
  });

  it("marks online voices, which may send the text to a cloud service", () => {
    expect(voiceLabel(voices[2] as (typeof voices)[number])).toBe(
      "Google UK English (en-GB) · online voice",
    );
    expect(voiceLabel(voices[0] as (typeof voices)[number])).toBe("Zira (en-US)");
  });
});

describe("normalizeListen", () => {
  it("reads saved settings with defaults", () => {
    expect(normalizeListen(null)).toEqual({ voice: "", rate: 1, next: false });
    expect(normalizeListen({ voice: "Zira", rate: 1.5, next: true })).toEqual({
      voice: "Zira",
      rate: 1.5,
      next: true,
    });
    expect(normalizeListen({ rate: 9 }).rate).toBe(1);
  });
});
