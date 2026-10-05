# Task 035 — Council communism and De Leon: rights, first wave, permission requests

| | |
|---|---|
| **Status** | Open (needs the maintainer: rights verification, permission emails) |
| **Filed** | 2026-10-05 |
| **Owner** | Maintainer (rights), then contributors |
| **Severity** | High: this is the archive's next direction |
| **Milestone** | M3 (archive growth) |
| **Depends on** | 034 (term senses: needed as soon as a second author is imported) |
| **Related** | 032 C (reading paths), 033 (original-language layer), SDD §5.6 (rights), §5.7 (collections) |

## Direction (maintainer, 2026-10-05)
- The archive grows around **council communism and De Leonism**: Gorter, Rühle, Pannekoek, the KAPD, De Leon, Mattick. It keeps the Marx/Engels foundations, and adds Luxemburg and Lenin where the debates need them; for example, Gorter's *Open Letter* answers Lenin's *"Left-Wing" Communism*.
- **The platform stays faithful and labelled.** Plain English never takes sides. Interpretation goes in labelled Context, signed and sourced, or in a reading path's rationale.
- **The authors wanted their work spread, but that is not a licence.** It makes permission easier to get; it does not replace it. A Plain English version is an adaptation, so works still in copyright need a recorded permission (`rights.status: PERMISSION_GRANTED` with `permission`: where and how it was given).

## Rights findings (research, 2026-10-05)
Checked against: US (works first published 1930 or earlier are public domain), life+70, Mexico (life+100, but not backwards for authors who died before 1952), and Vietnam (life+50). Each translation was checked separately from its author. Confidence is the researcher's; **the maintainer verifies each work before import**, as for the Manifesto.

**Watch out:** in several cases the English text on MIA is a modern copyrighted translation or edit, while an older free one exists. The source text must be the free edition, even where MIA has a different one.

| Work | Status | Free text to use | Confidence |
|---|---|---|---|
| Marx, *The Civil War in France* (1871) | **Free** (written in English) | The 1871 English edition. Leave out Engels's 1891 introduction unless a translation published by 1930 is found | High |
| Marx, *Critique of the Gotha Programme* | Original free; **MIA's translation unclear** (Progress, 1970) | First US translation, SLP's *The People*, 7 Jan 1900 (a copy must be found) | Medium |
| Luxemburg, *Reform or Revolution* | **Free** (translator "Integer", 1937, no US renewal) | The 1937 Three Arrows Press text | Medium |
| Luxemburg, *The Mass Strike* | **US only** for now | Lavin, Detroit 1925, unmodified; needs Patrick Lavin's death year | Medium |
| Gorter, *Open Letter to Comrade Lenin* (1920) | **Free** | The anonymous 1921 *Workers' Dreadnought* translation, not the 1989 Wildcat edit | Medium-high |
| Lenin, *"Left-Wing" Communism* (1920) | **Free** in the 1920 London / 1921 Detroit editions | Not Katzer (1964) or Trachtenberg (renewed) | High |
| De Leon, *Reform or Revolution* (1896) | **Free** (English original) | MIA (mirrored with the SLP's agreement) | High |
| De Leon, *What Means This Strike?* (1898) | **Free** | MIA | High |
| De Leon, *Socialist Reconstruction of Society* (1905) | **Free** | MIA | High |
| Pannekoek, *Marxism and Darwinism* (1909; Weiser 1912) | **US and Vietnam only**; EU from 1 Jan 2031 | Weiser 1912 | High |
| Pannekoek, *World Revolution and Communist Tactics* (1920) | **Permission:** Pannekoek's heirs + D. A. Smart / Pluto (1978 translation) | — | Medium-high |
| Pannekoek, *Lenin as Philosopher* (1938) | **Permission:** Pannekoek's heirs (likely protected in the US too, restored by the 1994 URAA law) | — | Medium |
| Pannekoek, *Workers' Councils* (1946–47) | **Permission:** Pannekoek's heirs | — | Medium |
| Rühle, *The Revolution Is Not a Party Affair* (1920) | German original **free**; English translations' holders unknown | A new translation from the German | Medium |
| Rühle, *From the Bourgeois to the Proletarian Revolution* (1924) | German **free**; English (1974): **permission** from the CWO / ICT, or a new translation | — | Medium |
| KAPD programme (1920) | German **free**; English (ICC, 1999): **permission**, or a new translation | — | Medium |
| Mattick, *Marx and Keynes* (1969), *Anti-Bolshevik Communism* (1978) | **Permission:** Paul Mattick Jr. (+ Porter Sargent / Merlin Press) | — | High |

Sources: the research report of 2026-10-05: MIA pages, the Stanford Copyright Renewal Database, Wikisource, Wikipedia, Wikimedia Commons (Mexico), left-dis.nl, internationalism.org, libcom.org. Re-check each source when importing.

## First wave (free now, everywhere the project checks)
1. **De Leon:** *Reform or Revolution*, *What Means This Strike?*, *Socialist Reconstruction of Society*. These are English originals already on MIA, so the existing adapter should work. Best for **Context + term cards only**: plain American English, full of 1890s names and events. Rewrite into Plain English only where readers get stuck.
2. **Marx:** *The Civil War in France* (the Address). The Paris Commune is the touchstone for council communism. Full Plain English.
3. **Gorter:** *Open Letter to Comrade Lenin*, the 1921 text. Mostly Context; the polemic is full of 1920 references.
4. **Lenin:** *"Left-Wing" Communism*, the 1920/1921 edition, as the text Gorter answers. Pair the two in a reading path.
5. **Luxemburg:** *Reform or Revolution*, the 1937 text.

Before each import, `pnpm plm parse-check <url> --via wayback`. Where MIA's text is not the free edition (Gorter, Luxemburg, Lenin), the source is a scan or transcription of that edition: a new kind of source page (parser guide).

## Second wave: permission requests (the maintainer sends them)
Drafts below. Send from the maintainer's address; save each reply. A forwarded email is enough to record in `rights.permission`.

1. **Pannekoek's heirs.** The family granted the Dutch *Lenin als filosoof* (De Vlam, 1973). Ask the International Institute of Social History (IISH, Amsterdam), which holds his papers, for a contact. One grant unlocks *Lenin as Philosopher*, *Workers' Councils*, *World Revolution* (also ask Pluto Press / D. A. Smart for that translation) and *Marxism and Darwinism* in the EU before 2031.
2. **Paul Mattick Jr.**, for *Marx and Keynes* and *Anti-Bolshevik Communism*. One unconfirmed report says he released some of his father's writings "anti-copyright" in 2021, so ask him directly.
3. **The ICC (internationalism.org) and the ICT / CWO**, for their KAPD and Rühle translations. Or skip them: translate the free German originals ourselves (see "Own translations").

### Draft request (adapt per recipient)
> Subject: Permission request: [work] for Plain Language Marxist (free, non-commercial)
>
> Dear [name],
>
> I run Plain Language Marxist, a free, open website (https://plain-language-marxist.pages.dev) that presents classic socialist texts three ways: the original text, a Plain English version for newcomers and readers whose first language is not English, and clearly labelled notes on context. Nothing is sold; there are no ads or accounts. The Plain English is always marked as our version, never as the author's words, and the original is one click away.
>
> We would like to include [work, edition] by [author]. This means publishing the text and a Plain English adaptation of it, under Creative Commons BY-SA, with full credit to [author/translator/publisher].
>
> Would you allow this? A reply to this email is enough for our records. If you have conditions (credit wording, a link, excluding the adaptation), we will follow them.
>
> With thanks and solidarity,
> [maintainer]

## Own translations (decision needed)
Rühle (1920, 1924) and the KAPD programme are free in German but not in English. A PLM translation would be new work, published CC BY-SA. Decide before starting:
- Who translates, and who checks against the German?
- AI-assisted drafting, declared and reviewed as for Plain English?
- How is it labelled? "English translation by Plain Language Marxist" is not the author's words in English either, so it must be labelled like Plain English.

This connects to task 033 (an original-language layer), which would show the German next to the translation.

## Acceptance
- For each first-wave work, `work.yml` records rights verified by the maintainer, and the source is the free edition.
- The permission requests are sent, and their answers are recorded here.
- A "Council communism" collection and at least one reading path (e.g. "From the Paris Commune to the workers' councils") are published, labelled as suggested, with a rationale.
