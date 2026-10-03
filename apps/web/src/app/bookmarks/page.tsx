import type { Metadata } from "next";
import { BookmarkList } from "../../components/BookmarkList";

export const metadata: Metadata = { title: "Bookmarks", robots: { index: false } };

export default function BookmarksPage() {
  return (
    <div className="prose-page">
      <h1>Bookmarks</h1>
      <p className="muted">Bookmarks are saved in this browser only.</p>
      <BookmarkList />
    </div>
  );
}
