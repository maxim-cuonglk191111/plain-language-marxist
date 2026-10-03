import type { Metadata } from "next";
import { Search } from "../../components/Search";

export const metadata: Metadata = { title: "Search", alternates: { canonical: "/search/" } };

export default function SearchPage() {
  return (
    <div className="prose-page">
      <h1>Search</h1>
      <Search />
      <noscript>
        <p className="notice">
          Search needs JavaScript. Every text is still readable from the library on the home page.
        </p>
      </noscript>
    </div>
  );
}
