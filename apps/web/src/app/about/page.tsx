import type { Metadata } from "next";
import { ISSUES_URL, REPO_URL, repoLink } from "../../lib/project";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Plain Language Marxist works: the three layers, how wording is chosen, how AI is used, rights and privacy.",
};

/** The editorial principles in plain words (task 020). Static: works without JavaScript. */
export default function AboutPage() {
  return (
    <div className="prose-page about-page">
      <h1>About this project</h1>
      <p className="lede">
        Plain Language Marxist helps you read classic Marxist texts. It is for people who are new to
        Marxism, and for people who read English as a second language. It is free and open source,
        and anyone can suggest a correction.
      </p>
      <p>
        Our main rule is: <strong>simplify the words, not the argument.</strong>
      </p>
      <p>
        Questions and objections are answered in the <a href="/faq/">FAQ</a>.
      </p>

      <h2 id="layers">Three layers</h2>
      <p>Every text is shown in three layers. You can switch each one on or off.</p>
      <dl className="about-layers">
        <dt>Original</dt>
        <dd>
          The text as it was published, with its original layout. We never change it. For the{" "}
          <cite>Communist Manifesto</cite>, the Original is the English translation by Samuel Moore
          from 1888, which Engels edited.
        </dd>
        <dt>Plain English</dt>
        <dd>
          The same text in modern, everyday English. Old and rare words become common words. Long
          sentences become shorter sentences. Nothing else changes.
        </dd>
        <dt>Context</dt>
        <dd>
          Short notes about people, events and background that a new reader may not know. Each note
          is labelled with its kind, for example &ldquo;Background&rdquo; or
          &ldquo;Interpretation&rdquo;, and lists its sources where it uses them.
        </dd>
      </dl>
      <p>
        Without JavaScript, all three layers show at once. Notes about the text itself, such as a
        known difference from the German, appear next to the Original as &ldquo;Text note&rdquo;.
      </p>

      <h2 id="argument">Only the wording changes</h2>
      <p>The Plain English layer must keep everything the text says:</p>
      <ul>
        <li>every claim, example, list item, number, name and quotation;</li>
        <li>
          every &ldquo;not&rdquo;, &ldquo;only&rdquo;, &ldquo;must&rdquo; and &ldquo;because&rdquo;;
        </li>
        <li>
          the authors&rsquo; voice. It says what the text says, not &ldquo;Marx argues
          that&hellip;&rdquo;;
        </li>
        <li>strong claims stay just as strong. We do not soften them or add warnings.</li>
      </ul>
      <p>
        The Plain English does not add definitions, examples or comments, and it does not summarize.
        Those belong in term cards and in Context. If a sentence is already clear, the Plain English
        stays almost the same.
      </p>

      <h2 id="original">The Original is always one click away</h2>
      <p>
        Plain English is a reading aid. It does not replace the text. You can show the Original next
        to it at any time, and every chapter links to the page we took it from (&ldquo;View original
        source&rdquo;). When you copy or share Plain English, the copy says that it is our version,
        not the original wording.
      </p>

      <h2 id="terms">Terms and their wordings</h2>
      <p>
        We keep the important Marxist terms, such as <em>means of production</em>, <em>capital</em>{" "}
        and <em>class struggle</em>. We do not replace them with looser everyday words. Instead,
        each term has a <strong>term card</strong>: tap or click a marked word to see what it means
        in the text, in short sentences, with an example from the text.
      </p>
      <p>
        A few terms, such as <em>bourgeoisie</em> and <em>proletariat</em>, are hard for new
        readers. For these, the project chooses a default modern wording, such as &ldquo;capitalist
        class&rdquo;. The term card shows:
      </p>
      <ul>
        <li>why we chose this wording, and what it does not capture well;</li>
        <li>the other wordings you can use instead.</li>
      </ul>
      <p>
        You can choose &ldquo;Original terms&rdquo; to see the terms Marx and Engels used, or pick a
        wording for each term. Your choice changes only what you see. The Original text never
        changes. All terms are listed on the <a href="/vocabulary/">Vocabulary</a> page.
      </p>

      <h2 id="ai">How we use AI</h2>
      <p>
        Some Plain English and some notes are first drafted with the help of an AI language model.
        Our rules for this are:
      </p>
      <ul>
        <li>
          <strong>Always declared.</strong> AI-assisted text carries an &ldquo;AI-assisted&rdquo;
          label in the reader.
        </li>
        <li>
          <strong>Always reviewed by people.</strong> A person checks each passage against the
          Original before it is published. Automatic checks also look for lost words like
          &ldquo;not&rdquo; or &ldquo;only&rdquo;, changed numbers, and added comments.
        </li>
        <li>
          <strong>Never applied automatically.</strong> AI text enters the project only through
          these checks and a person&rsquo;s review. The site itself does not use AI: reading works
          without any AI service.
        </li>
      </ul>

      <h2 id="review">Who checks the text</h2>
      <p>
        All published text is kept in a public Git repository, so every change can be seen,
        discussed and undone. The project is at an early stage. Today the maintainer reviews every
        change, and we are looking for more reviewers: reading groups, teachers and students. How
        review works is described in <a href={repoLink("GOVERNANCE.md")}>GOVERNANCE.md</a>.
        Reviewers judge fidelity to the source and clarity, not politics.
      </p>

      <h2 id="rights">Sources and rights</h2>
      <ul>
        <li>
          We only use texts that may be shared and changed: texts in the public domain, or under an
          open license. We check the rights for each work and record them.
        </li>
        <li>
          Our source for the original texts is the{" "}
          <a href="https://www.marxists.org/" rel="external">
            Marxists Internet Archive
          </a>{" "}
          (MIA). Every chapter credits MIA and links to its page.
        </li>
        <li>
          <strong>Plain Language Marxist is not part of MIA</strong> and is not affiliated with it.
          Before launch, we told MIA volunteers about the project, and they had no objection.
        </li>
        <li>
          Our Plain English, Context notes and term cards are licensed under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. The code is
          AGPL-3.0. Details: <a href={repoLink("LICENSING.md")}>LICENSING.md</a>.
        </li>
      </ul>

      <h2 id="privacy">Privacy</h2>
      <ul>
        <li>There are no accounts, no tracking and no analytics.</li>
        <li>
          Your settings, reading progress, highlights, notes and bookmarks are saved only in your
          browser, on your device. We never receive them. You can export them from the{" "}
          <a href="/notes/">Notes</a> page.
        </li>
        <li>
          Fonts are served by this site, not by an outside service. Like any website, the web host
          receives normal page requests.
        </li>
        <li>
          Read aloud uses your browser&rsquo;s own voices. Some browsers offer voices that send the
          text to an online service; the reader labels these &ldquo;online voice&rdquo;.
        </li>
        <li>Quote cards are made in your browser. Nothing is sent unless you share it.</li>
      </ul>

      <h2 id="more">Read more</h2>
      <ul>
        <li>
          <a href={repoLink("docs/editorial/STYLE.md")}>Plain English style guide</a>: the full
          editorial rules, with worked examples.
        </li>
        <li>
          <a href={repoLink("GOVERNANCE.md")}>Governance</a>: roles, review rules and how rights
          claims are handled.
        </li>
        <li>
          <a href={REPO_URL}>Source code and content on GitHub</a>.
        </li>
        <li>
          Found a mistake? <a href={ISSUES_URL}>Report it on GitHub</a>, or see the{" "}
          <a href="/faq/#mistake">FAQ</a>.
        </li>
      </ul>
    </div>
  );
}
