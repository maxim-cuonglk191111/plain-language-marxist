import type { Metadata } from "next";
import { NotesList } from "../../components/NotesList";
import { refPrefixes } from "../../lib/reading";

export const metadata: Metadata = { title: "Notes", robots: { index: false } };

export default function NotesPage() {
  return (
    <div className="prose-page">
      <h1>Notes</h1>
      <p className="muted">Your bookmarks, highlights and notes, saved in this browser only.</p>
      <NotesList refs={refPrefixes("en-plain")} />
    </div>
  );
}
