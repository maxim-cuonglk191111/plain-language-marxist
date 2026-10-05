import type { Metadata } from "next";
import { ISSUES_URL, REPO_URL, repoLink } from "../../lib/project";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions about Plain Language Marxist: dumbing down, translation, terminology, AI, neutrality, citing and reporting mistakes.",
};

const QUESTIONS = [
  ["dumbing-down", "Isn’t this dumbing down Marx?"],
  ["translation", "Isn’t this a translation of a translation?"],
  ["terms", "Who decides how a term is worded?"],
  ["ai", "Do you use AI?"],
  ["done-before", "Hasn’t this been done before?"],
  ["neutral", "Is this neutral? Whose interpretation is in Context?"],
  ["mia", "Is this part of the Marxists Internet Archive?"],
  ["cite", "How do I quote or cite a passage?"],
  ["mistake", "I found a mistake. How do I report it?"],
  ["help", "Can I help?"],
] as const;

/** Answers to the expected objections and newcomer questions (task 020). Static: works without JavaScript. */
export default function FaqPage() {
  return (
    <div className="prose-page faq-page">
      <h1>Frequently asked questions</h1>
      <p className="lede">
        Short answers about how this project works. For the principles in one place, see{" "}
        <a href="/about/">About</a>.
      </p>
      <nav aria-label="Questions">
        <ul className="faq-toc">
          {QUESTIONS.map(([id, q]) => (
            <li key={id}>
              <a href={`#${id}`}>{q}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="dumbing-down">Isn&rsquo;t this dumbing down Marx?</h2>
      <p>
        No. We simplify the <strong>words</strong>, never the <strong>argument</strong>. The Plain
        English keeps every claim, example, number, name and quotation. It keeps words like
        &ldquo;not&rdquo;, &ldquo;only&rdquo; and &ldquo;must&rdquo;, and strong claims stay just as
        strong. It does not summarize, and it does not remove difficult ideas: it makes the sentence
        easier, not the idea.
      </p>
      <p>
        We also keep the important Marxist terms, such as <em>means of production</em>, and explain
        them in term cards. And the Original is always one click away, so you can check any sentence
        yourself.
      </p>

      <h2 id="translation">Isn&rsquo;t this a translation of a translation?</h2>
      <p>
        Yes, partly. Marx and Engels wrote the <cite>Communist Manifesto</cite> in German in 1848.
        Our Original layer is the English translation by Samuel Moore, published in 1888. Engels
        edited this translation and added notes to it, so it is the authorized English version.
      </p>
      <p>
        The Plain English modernizes Moore&rsquo;s English. It does not try to correct it towards
        the German. Where Moore&rsquo;s English is known to differ from the German, or Engels added
        something in 1888, we say so in a &ldquo;Text note&rdquo; next to the Original. We plan to
        add the German text as an optional layer later.
      </p>

      <h2 id="terms">Who decides how a term is worded?</h2>
      <p>
        For a few hard terms, such as <em>bourgeoisie</em>, the project chooses a default modern
        wording, such as &ldquo;capitalist class&rdquo;. People will disagree about these choices,
        so:
      </p>
      <ul>
        <li>
          Each default is reviewed. Changing a default needs a stricter review than other changes,
          and the proposal stays open for at least 7 days.
        </li>
        <li>
          The term card shows why we chose the wording, what it does not capture well, and the other
          wordings.
        </li>
        <li>
          You can switch: choose &ldquo;Original terms&rdquo;, or another wording for each term.
          This changes only what you see.
        </li>
      </ul>
      <p>
        If you think a better wording exists, propose it as an alternative. Alternatives stay
        visible to every reader.
      </p>

      <h2 id="ai">Do you use AI?</h2>
      <p>
        Yes, for drafts. Some Plain English and some notes are first drafted with an AI language
        model. Our rules are:
      </p>
      <ul>
        <li>
          <strong>Always declared:</strong> this text has an &ldquo;AI-assisted&rdquo; label in the
          reader.
        </li>
        <li>
          <strong>Always reviewed by people:</strong> a person checks each passage against the
          Original before it is published.
        </li>
        <li>
          <strong>Never applied automatically:</strong> AI text goes through automatic checks and a
          person&rsquo;s review first. The website itself does not use AI.
        </li>
      </ul>

      <h2 id="done-before">Hasn&rsquo;t this been done before?</h2>
      <p>
        Plain-English editions exist. For example, BookCaps published{" "}
        <cite>The Communist Manifesto in Plain and Simple English</cite> in 2012, a commercial
        edition. What this project adds:
      </p>
      <ul>
        <li>it is open and free, and anyone can suggest a correction;</li>
        <li>every wording choice is reviewed, and the reason for it is visible;</li>
        <li>the terminology is transparent, and you can switch it;</li>
        <li>the original layout is kept, and the Original is always one click away.</li>
      </ul>

      <h2 id="neutral">Is this neutral? Whose interpretation is in Context?</h2>
      <p>
        No text about politics is perfectly neutral. What we promise is that you can always see
        which words are the authors&rsquo; and which are ours.
      </p>
      <ul>
        <li>
          <strong>Plain English</strong> must not add commentary, opinions or explanations. It says
          only what the Original says.
        </li>
        <li>
          <strong>Context</strong> is the project&rsquo;s own background and notes. Each note is
          labelled with its kind, for example &ldquo;Background&rdquo; or
          &ldquo;Interpretation&rdquo;, and lists its sources where it uses them. Where readers of
          Marx really disagree, a note or term card says so and names each view.
        </li>
        <li>
          Reviewers judge fidelity to the source and clarity. They do not reject a contribution
          because of its politics.
        </li>
      </ul>

      <h2 id="mia">Is this part of the Marxists Internet Archive?</h2>
      <p>
        No. Plain Language Marxist is not affiliated with the{" "}
        <a href="https://www.marxists.org/" rel="external">
          Marxists Internet Archive
        </a>{" "}
        (MIA). We take the original texts from MIA, and every chapter credits MIA and links to its
        page. Before launch, we told MIA volunteers about the project, and they had no objection.
      </p>

      <h2 id="cite">How do I quote or cite a passage?</h2>
      <p>
        Every passage has a short reference. For example, <strong>Manifesto II.17</strong> means the{" "}
        <cite>Manifesto</cite>, chapter II, passage 17. These numbers do not change. You can type a
        reference into Search to find the passage.
      </p>
      <p>
        Tap a passage, or use its &ldquo;&#8943;&rdquo; button, and choose{" "}
        <strong>Copy with source</strong>. The copy includes the reference and a link. When you copy
        Plain English, the copy says that it is our version, not the original wording.
      </p>
      <p>
        In academic work, quote the Original (Moore&rsquo;s 1888 translation) and say where you
        found it. If you quote the Plain English, say that it is the Plain Language Marxist version.
      </p>

      <h2 id="mistake">I found a mistake. How do I report it?</h2>
      <p>
        Please <a href={ISSUES_URL}>open an issue on GitHub</a> (you need a free GitHub account).
        Include the passage reference, such as &ldquo;Manifesto I.13&rdquo;, the layer (Original,
        Plain English or Context), and what is wrong. If the Plain English changes the meaning, that
        is the most important kind of mistake to report.
      </p>

      <h2 id="help">Can I help?</h2>
      <p>
        Yes. Reporting mistakes already helps. We are also looking for reviewers: people from
        reading groups, teachers and students who will compare the Plain English with the Original.
        Read the <a href={repoLink("docs/editorial/STYLE.md")}>style guide</a> and{" "}
        <a href={repoLink("GOVERNANCE.md")}>how review works</a>, then say hello on{" "}
        <a href={REPO_URL}>GitHub</a>.
      </p>
    </div>
  );
}
