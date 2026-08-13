import { DOCS_BASE_URL, DOCS_PATHS, docsLink, docsUrl } from "../docsLinks";

describe("docsLinks", () => {
  it("builds absolute docs URLs", () => {
    expect(docsUrl("workflow-editor")).toBe(
      `${DOCS_BASE_URL}/workflow-editor`
    );
    expect(docsUrl("/workflow-editor")).toBe(
      `${DOCS_BASE_URL}/workflow-editor`
    );
    expect(docsLink("collections")).toBe(`${DOCS_BASE_URL}/collections`);
  });

  it("exposes a non-empty path for every topic", () => {
    for (const [_topic, docPath] of Object.entries(DOCS_PATHS)) {
      expect(docPath.length).toBeGreaterThan(0);
    }
  });
});
