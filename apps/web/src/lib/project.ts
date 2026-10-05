/** Where the project's code, content and editorial rules live (linked from /about/ and /faq/). */
export const REPO_URL = "https://github.com/maxim-cuonglk191111/plain-language-marxist";

/** A file or folder on the default branch, e.g. repoLink("docs/editorial/STYLE.md"). */
export function repoLink(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}

export const ISSUES_URL = `${REPO_URL}/issues`;
