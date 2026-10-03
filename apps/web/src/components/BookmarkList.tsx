"use client";

import { useEffect, useState } from "react";
import { BOOKMARKS_KEY, readJson, writeJson, type Bookmark } from "../lib/prefs";

export function BookmarkList() {
  const [items, setItems] = useState<Bookmark[] | null>(null);
  useEffect(() => setItems(readJson<Bookmark[]>(BOOKMARKS_KEY, [])), []);

  const remove = (b: Bookmark) => {
    const next = (items ?? []).filter((x) => !(x.path === b.path && x.passage === b.passage));
    setItems(next);
    writeJson(BOOKMARKS_KEY, next);
  };

  if (items === null) return null;
  if (items.length === 0)
    return <p>No bookmarks yet. Use the bookmark button beside any passage.</p>;
  return (
    <ul className="bookmark-list">
      {items.map((b) => (
        <li key={`${b.path}#${b.passage}`}>
          <a href={`${b.path}#${b.passage}`}>{b.title}</a>
          <p>{b.snippet}</p>
          <button type="button" className="link-button" onClick={() => remove(b)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
