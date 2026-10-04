import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReaderSettings } from "../components/ReaderSettings";
import { siteUrl } from "../lib/data";
import { BOOT_SCRIPT } from "../lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Plain Language Marxist", template: "%s · Plain Language Marxist" },
  description:
    "Historical Marxist texts in the original, in plain modern English, and with explanations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to the text
        </a>
        <header className="site-header">
          <a href="/" className="site-name">
            Plain Language Marxist
          </a>
          <nav aria-label="Site">
            <a href="/vocabulary/">Vocabulary</a>
            <a href="/search/">Search</a>
            <a href="/notes/">Notes</a>
            <ReaderSettings />
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <p>
            Plain English and explanations:{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Original
            texts as credited on each page. Code: AGPL-3.0.
          </p>
        </footer>
      </body>
    </html>
  );
}
