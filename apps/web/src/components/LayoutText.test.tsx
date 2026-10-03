import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LayoutText } from "./LayoutText";

const html = (text: string) =>
  renderToStaticMarkup(<LayoutText text={text} footnotes={new Map([["2", "p00063"]])} />);

describe("LayoutText", () => {
  it("renders the closed tag set and links footnote markers to their notes", () => {
    expect(html('All <i>written</i> history<fn ref="2"/>.<br/>Next')).toBe(
      'All <i>written</i> history<sup class="fn-ref"><a href="#p00063" aria-label="Note 2">2</a></sup>.<br/>Next',
    );
  });

  it("renders table passages as tables with spans", () => {
    expect(html('<tr><th colspan="2">Year</th></tr><tr><td>1864</td><td>£</td></tr>')).toBe(
      '<div class="table-wrap"><table><tbody><tr><th colSpan="2">Year</th></tr><tr><td>1864</td><td>£</td></tr></tbody></table></div>',
    );
  });

  it("escapes text, so markup in content can never inject HTML", () => {
    expect(html("a &lt;script&gt; b")).toBe("a &lt;script&gt; b");
  });
});
