"use client";

import type { DataSearch } from "@plm/schema";
import MiniSearch from "minisearch";
import { useEffect, useMemo, useState } from "react";

const LAYER = { o: "Original", p: "Plain English", e: "Explanation", v: "Vocabulary" } as const;
type Entry = DataSearch["entries"][number] & { id: number };
/** A result opens the reader with the layer it was found in (task 023). */
const SEARCH_LAYERS: Record<string, string> = { o: "original", p: "plain", e: "plain,explain" };

/** Client-side search over /data/v1/search.json, with every result labelled by layer (SDD §10.3). */
export function Search() {
  const [data, setData] = useState<DataSearch | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get("q") ?? "");
    fetch("/data/v1/search.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: DataSearch) => setData(json))
      .catch(() => setError(true));
  }, []);

  const index = useMemo(() => {
    if (!data) return null;
    const mini = new MiniSearch<Entry>({
      fields: ["t"],
      storeFields: ["d", "p", "l", "t"],
      searchOptions: { prefix: true, fuzzy: 0.1, combineWith: "AND" },
    });
    mini.addAll(data.entries.map((e, id) => ({ ...e, id })));
    return mini;
  }, [data]);

  const results = useMemo(
    () => (index && query.trim().length > 1 ? index.search(query).slice(0, 50) : []),
    [index, query],
  );

  const update = (q: string) => {
    setQuery(q);
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  };

  return (
    <div className="search">
      <label htmlFor="search-input">
        Search the texts, plain English, explanations and vocabulary
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        autoComplete="off"
        onChange={(e) => update(e.target.value)}
        placeholder="e.g. guild-master, world market, class struggles"
      />
      {error && <p className="notice">The search index could not be loaded.</p>}
      <p className="muted" aria-live="polite">
        {query.trim().length > 1 && index
          ? `${results.length} result${results.length === 1 ? "" : "s"}`
          : ""}
      </p>
      <ol className="search-results">
        {results.map((r) => {
          const e = r as unknown as Entry;
          const doc = e.d >= 0 ? data?.documents[e.d] : undefined;
          const href =
            e.l === "v"
              ? `/vocabulary/${e.p}/`
              : `${doc?.path ?? "/"}?layers=${SEARCH_LAYERS[e.l] ?? "plain"}#${e.p}`;
          return (
            <li key={r.id}>
              <span className={`layer-tag layer-${e.l}`}>{LAYER[e.l]}</span>{" "}
              <a href={href}>{e.l === "v" ? e.t.split(":")[0] : (doc?.title ?? e.p)}</a>
              <p>{e.l === "v" ? e.t.split(": ").slice(1).join(": ") : e.t.slice(0, 220)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
