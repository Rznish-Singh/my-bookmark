import { describe, expect, it } from "vitest";
import { BookmarkParseError, buildFolderTree, parseBookmarksHTML } from "@/lib/parsers/bookmark-html-parser";
import { buildBookmarksHtml } from "@/lib/parsers/bookmark-html-writer";

const chrome = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><H3>Development</H3>
        <DL><p>
            <DT><H3>React</H3>
            <DL><p>
                <DT><A HREF="https://react.dev/" ADD_DATE="1700000100" ICON="data:image/png;base64,AAA">React &amp; Friends</A>
            </DL><p>
            <DT><H3>Empty</H3>
            <DL><p>
            </DL><p>
            <DT><A HREF="https://nextjs.org/docs">Next.js Docs</A>
            <DD>The React framework
        </DL><p>
        <DT><A HREF="https://EXAMPLE.com/">Root link</A>
        <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
    </DL><p>
    <DT><A HREF="https://example.com">Example dup</A>
</DL><p>`;

describe("parseBookmarksHTML", () => {
  const r = parseBookmarksHTML(chrome);

  it("preserves nested folders", () => {
    const byName = Object.fromEntries(r.folders.map((f) => [f.name, f]));
    expect(byName["Bookmarks bar"].parentId).toBeNull();
    expect(byName["Development"].parentId).toBe(byName["Bookmarks bar"].id);
    expect(byName["React"].parentId).toBe(byName["Development"].id);
    expect(byName["React"].depth).toBe(2);
    expect(byName["Empty"].parentId).toBe(byName["Development"].id);
  });

  it("attaches bookmarks to the right folder", () => {
    const folder = (id: string | null) => r.folders.find((f) => f.id === id)?.name ?? null;
    const react = r.bookmarks.find((b) => b.url === "https://react.dev/")!;
    expect(folder(react.folderId)).toBe("React");
    expect(folder(r.bookmarks.find((b) => b.title === "Next.js Docs")!.folderId)).toBe("Development");
    expect(folder(r.bookmarks.find((b) => b.title === "Root link")!.folderId)).toBe("Bookmarks bar");
    expect(r.bookmarks.find((b) => b.title === "Example dup")!.folderId).toBeNull(); // sits at the library root
  });

  it("decodes entities, timestamps, icons and descriptions", () => {
    const react = r.bookmarks.find((b) => b.url === "https://react.dev/")!;
    expect(react.title).toBe("React & Friends");
    expect(react.addDate?.toISOString()).toBe(new Date(1700000100 * 1000).toISOString());
    expect(react.icon).toMatch(/^data:image\/png/);
    expect(r.bookmarks.find((b) => b.title === "Next.js Docs")!.description).toBe("The React framework");
  });

  it("skips non-http links and detects duplicates", () => {
    expect(r.stats.skippedCount).toBe(1);
    expect(r.stats.duplicateCount).toBe(1);
    expect(r.duplicates[0].indexes).toHaveLength(2);
  });

  it("reports stats and builds a tree", () => {
    expect(r.stats.folderCount).toBe(4);
    expect(r.stats.nestedFolderCount).toBe(3);
    expect(r.stats.maxDepth).toBe(3);
    const tree = buildFolderTree(r);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children.map((c) => c.name).sort()).toEqual(["Empty", "React"]);
  });
});

describe("parser edge cases", () => {
  it("handles 10 levels of nesting", () => {
    let html = "<DL><p>";
    for (let i = 1; i <= 10; i++) html += `<DT><H3>L${i}</H3><DL><p>`;
    html += `<DT><A HREF="https://deep.example/">Deep</A>`;
    for (let i = 1; i <= 10; i++) html += "</DL><p>";
    html += "</DL><p>";
    const r = parseBookmarksHTML(html);
    expect(r.folders).toHaveLength(10);
    expect(r.stats.maxDepth).toBe(10);
    expect(r.folders.find((f) => f.id === r.bookmarks[0].folderId)!.name).toBe("L10");
  });

  it("handles 1000+ bookmarks quickly", () => {
    let html = "<DL><p>";
    for (let f = 0; f < 20; f++) {
      html += `<DT><H3>Folder ${f}</H3><DL><p>`;
      for (let i = 0; i < 60; i++) html += `<DT><A HREF="https://site${f}.example/page/${i}">P ${f}-${i}</A>`;
      html += "</DL><p>";
    }
    html += "</DL>";
    const t = Date.now();
    const r = parseBookmarksHTML(html);
    expect(r.bookmarks).toHaveLength(1200);
    expect(Date.now() - t).toBeLessThan(2000);
  });

  it("copes with malformed HTML (missing closers, unclosed anchors)", () => {
    const r = parseBookmarksHTML(
      `<DL><DT><H3>Broken<DL><DT><A HREF="https://a.example/">A<DT><A HREF="https://b.example/">B</A>`,
    );
    expect(r.folders.map((f) => f.name)).toEqual(["Broken"]);
    expect(r.bookmarks.map((b) => b.title)).toEqual(["A", "B"]);
    expect(r.bookmarks.every((b) => b.folderId === r.folders[0].id)).toBe(true);
  });

  it("names missing folders and titles sensibly", () => {
    const r = parseBookmarksHTML(`<DL><DT><H3></H3><DL><DT><A HREF="https://www.notitle.example/x"></A></DL></DL>`);
    expect(r.folders[0].name).toBe("Untitled folder");
    expect(r.bookmarks[0].title).toBe("notitle.example");
  });

  it("handles special characters and unicode", () => {
    const r = parseBookmarksHTML(
      `<DL><DT><H3>Café &lt;dev&gt; 日本語</H3><DL><DT><A HREF="https://x.example/?a=1&amp;b=2">&quot;Quoted&quot; &#38; more</A></DL></DL>`,
    );
    expect(r.folders[0].name).toBe("Café <dev> 日本語");
    expect(r.bookmarks[0].title).toBe('"Quoted" & more');
    expect(r.bookmarks[0].url).toBe("https://x.example/?a=1&b=2");
  });

  it("rejects files that are not bookmark exports", () => {
    expect(() => parseBookmarksHTML("<html><body><p>hello</p></body></html>")).toThrow(BookmarkParseError);
  });
});

describe("export round trip", () => {
  it("re-imports exactly what was exported", () => {
    const r = parseBookmarksHTML(chrome);
    const now = new Date();
    const html = buildBookmarksHtml(
      r.folders.map((f) => ({ id: f.id, parentId: f.parentId, name: f.name, createdAt: now })),
      r.bookmarks.map((b) => ({ title: b.title, url: b.url, folderId: b.folderId, createdAt: b.addDate ?? now, description: b.description })),
    );
    const again = parseBookmarksHTML(html);
    expect(again.stats.folderCount).toBe(r.stats.folderCount);
    expect(again.stats.bookmarkCount).toBe(r.stats.bookmarkCount);
    expect(again.stats.maxDepth).toBe(r.stats.maxDepth);
    expect(again.bookmarks.find((b) => b.url === "https://react.dev/")!.title).toBe("React & Friends");
  });
});
