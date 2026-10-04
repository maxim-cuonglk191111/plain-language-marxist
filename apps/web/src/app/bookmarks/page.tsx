import type { Metadata } from "next";
import { NotesList } from "../../components/NotesList";
import { refPrefixes } from "../../lib/reading";

export const metadata: Metadata = { title: "Bookmarks", robots: { index: false } };

/** Kept so old links work; bookmarks are now part of Notes (task 031 D). */
export default function BookmarksPage() {
  return (
    <div className="prose-page">
      <h1>Bookmarks</h1>
      <p className="muted">
        Bookmarks are now part of <a href="/notes/">Notes</a>, with your highlights. Saved in this
        browser only.
      </p>
      <NotesList initial="bookmark" refs={refPrefixes("en-plain")} />
    </div>
  );
}
