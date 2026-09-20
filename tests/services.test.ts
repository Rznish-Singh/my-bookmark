import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createBookmark, deleteBookmark, findDuplicate, moveBookmark, setFavorite, updateBookmark, getBookmark } from "@/lib/services/bookmark-service";
import { createFolder, deleteFolder, getDeleteImpact, getFolderTree, listFolders, updateFolder } from "@/lib/services/folder-service";
import { runImport, previewImport } from "@/lib/services/import-service";
import { searchService } from "@/lib/services/search-service";
import { createTag, listTags, renameTag } from "@/lib/services/tag-service";
import { exportHtml } from "@/lib/services/export-service";
import { listQuerySchema, createBookmarkSchema } from "@/lib/validators/bookmark";
import { parseBookmarksHTML } from "@/lib/parsers/bookmark-html-parser";

let userA: string;
let userB: string;

const q = (over: Partial<ReturnType<typeof listQuerySchema.parse>> = {}) => listQuerySchema.parse({ ...over });
const mk = (userId: string, url: string, extra: Record<string, unknown> = {}) =>
  createBookmark(userId, { url, title: url, tags: [], isFavorite: false, force: false, ...extra });

async function newUser() {
  const [u] = await db.insert(users).values({ email: `t-${randomUUID()}@test.dev`, name: "T", passwordHash: "x" }).returning();
  return u.id;
}

beforeAll(async () => {
  userA = await newUser();
  userB = await newUser();
});
afterAll(async () => {
  await db.delete(users).where(eq(users.id, userA));
  await db.delete(users).where(eq(users.id, userB));
  await sql.end();
});

describe("validation", () => {
  it("accepts bare domains and rejects junk / non-http", () => {
    expect(createBookmarkSchema.parse({ url: "example.com" }).url).toBe("https://example.com");
    expect(() => createBookmarkSchema.parse({ url: "javascript:alert(1)" })).toThrow();
    expect(() => createBookmarkSchema.parse({ url: "" })).toThrow();
    expect(() => createBookmarkSchema.parse({ url: "https://a.dev", folderId: "nope" })).toThrow();
  });
});

describe("folders", () => {
  it("creates nested folders and reports counts up the tree", async () => {
    const a = await createFolder(userA, { name: "Dev" });
    const b = await createFolder(userA, { name: "React", parentId: a.id });
    await mk(userA, "https://react.dev", { folderId: b.id });
    await mk(userA, "https://dev.to", { folderId: a.id });
    const tree = (await getFolderTree(userA)).find((n) => n.id === a.id)!;
    expect(tree.bookmarkCount).toBe(1);
    expect(tree.totalCount).toBe(2);
    expect(tree.children[0].name).toBe("React");
  });

  it("blocks moving a folder into itself or a descendant", async () => {
    const p = await createFolder(userA, { name: "P" });
    const c = await createFolder(userA, { name: "C", parentId: p.id });
    const g = await createFolder(userA, { name: "G", parentId: c.id });
    await expect(updateFolder(userA, p.id, { parentId: p.id })).rejects.toThrow(/itself/);
    await expect(updateFolder(userA, p.id, { parentId: g.id })).rejects.toThrow(/subfolders/);
    await expect(updateFolder(userA, g.id, { parentId: null })).resolves.toMatchObject({ parentId: null });
  });

  it("delete: move_to_parent keeps every bookmark and reparents subfolders", async () => {
    const top = await createFolder(userA, { name: "Top" });
    const mid = await createFolder(userA, { name: "Mid", parentId: top.id });
    const leaf = await createFolder(userA, { name: "Leaf", parentId: mid.id });
    const bm = await mk(userA, "https://mid.example", { folderId: mid.id });
    const impact = await getDeleteImpact(userA, mid.id);
    expect(impact).toEqual({ bookmarkCount: 1, subfolderCount: 1 });
    const res = await deleteFolder(userA, mid.id, "move_to_parent");
    expect(res).toEqual({ deletedBookmarks: 0, movedBookmarks: 1 });
    expect((await getBookmark(userA, bm.id)).folderId).toBe(top.id);
    expect((await listFolders(userA)).find((f) => f.id === leaf.id)!.parentId).toBe(top.id);
  });

  it("delete: delete_all removes the subtree and its bookmarks only", async () => {
    const top = await createFolder(userA, { name: "Doomed" });
    const sub = await createFolder(userA, { name: "Sub", parentId: top.id });
    const inside = await mk(userA, "https://inside.example", { folderId: sub.id });
    const outside = await mk(userA, "https://outside.example");
    const res = await deleteFolder(userA, top.id, "delete_all");
    expect(res.deletedBookmarks).toBe(1);
    await expect(getBookmark(userA, inside.id)).rejects.toThrow(/not found/i);
    await expect(getBookmark(userA, outside.id)).resolves.toBeTruthy();
  });
});

describe("bookmark CRUD, duplicates, favorites", () => {
  it("creates, updates, favorites, moves, deletes", async () => {
    const f = await createFolder(userA, { name: "CRUD" });
    const b = await mk(userA, "https://crud.example/a", { tags: ["one", "Two"], description: "hello" });
    expect(b.tags.map((t) => t.name).sort()).toEqual(["Two", "one"]);
    expect(b.domain).toBe("crud.example");

    const u = await updateBookmark(userA, b.id, { title: "Renamed", tags: ["three"], notes: "n" });
    expect(u.title).toBe("Renamed");
    expect(u.tags.map((t) => t.name)).toEqual(["three"]);

    expect((await setFavorite(userA, b.id)).isFavorite).toBe(true);
    expect((await setFavorite(userA, b.id)).isFavorite).toBe(false);

    const moved = await moveBookmark(userA, b.id, f.id);
    expect(moved.folderPath).toBe("CRUD");

    await deleteBookmark(userA, b.id);
    await expect(getBookmark(userA, b.id)).rejects.toThrow();
  });

  it("detects duplicates by normalized URL and allows force", async () => {
    await mk(userA, "https://Dupe.example/page/");
    await expect(mk(userA, "https://dupe.example/page?utm_source=x")).rejects.toMatchObject({ code: "conflict" });
    expect(await findDuplicate(userA, "https://DUPE.example/page")).toBeTruthy();
    await expect(mk(userA, "https://dupe.example/page", { force: true })).resolves.toBeTruthy();
    // Another user's identical URL is not a duplicate.
    await expect(mk(userB, "https://dupe.example/page")).resolves.toBeTruthy();
  });

  it("enforces ownership across users", async () => {
    const mine = await mk(userA, "https://private.example");
    const theirFolder = await createFolder(userB, { name: "B's" });
    await expect(getBookmark(userB, mine.id)).rejects.toThrow(/not found/i);
    await expect(updateBookmark(userB, mine.id, { title: "x" })).rejects.toThrow();
    await expect(deleteBookmark(userB, mine.id)).rejects.toThrow();
    await expect(moveBookmark(userA, mine.id, theirFolder.id)).rejects.toThrow(/not found/i);
    await expect(updateFolder(userA, theirFolder.id, { name: "hijack" })).rejects.toThrow();
  });
});

describe("tags", () => {
  it("is case-insensitive unique and renames safely", async () => {
    const t1 = await createTag(userA, "Alpha");
    const t2 = await createTag(userA, "alpha");
    expect(t2.id).toBe(t1.id);
    const other = await createTag(userA, "Beta");
    await expect(renameTag(userA, other.id, "ALPHA")).rejects.toMatchObject({ code: "conflict" });
    expect((await listTags(userA)).some((t) => t.name === "Alpha")).toBe(true);
  });
});

describe("search", () => {
  let uid: string;
  beforeAll(async () => {
    uid = await newUser();
    const dev = await createFolder(uid, { name: "Development" });
    const react = await createFolder(uid, { name: "React", parentId: dev.id });
    await mk(uid, "https://react.dev", { title: "React Documentation", folderId: react.id, tags: ["frontend"], isFavorite: true });
    await mk(uid, "https://tanstack.com/query", { title: "React Query", description: "Async state", folderId: react.id });
    await mk(uid, "https://postgresql.org", { title: "PostgreSQL 100% docs", notes: "remember the index chapter", tags: ["db"] });
    await mk(uid, "https://github.com/a/b", { title: "Repo", description: "underscore_name" });
  });
  afterAll(async () => void (await db.delete(users).where(eq(users.id, uid))));

  it("matches title, description, notes, tags, folder name, domain", async () => {
    const titles = async (query: string) => (await searchService.searchBookmarks(uid, q({ q: query }))).items.map((i) => i.title);
    expect((await titles("react")).length).toBe(2);
    expect(await titles("async state")).toEqual(["React Query"]);
    expect(await titles("index chapter")).toEqual(["PostgreSQL 100% docs"]);
    expect(await titles("frontend")).toEqual(["React Documentation"]);
    expect(await titles("development")).toHaveLength(2); // folder name
    expect(await titles("github.com")).toEqual(["Repo"]);
  });
  it("escapes LIKE wildcards", async () => {
    expect((await searchService.searchBookmarks(uid, q({ q: "100%" }))).total).toBe(1);
    expect((await searchService.searchBookmarks(uid, q({ q: "%" }))).total).toBe(1);
    expect((await searchService.searchBookmarks(uid, q({ q: "_" }))).total).toBe(1);
  });
  it("combines filters, includes subfolders, and paginates", async () => {
    const folders = await listFolders(uid);
    const dev = folders.find((f) => f.name === "Development")!;
    expect((await searchService.searchBookmarks(uid, q({ folderId: dev.id }))).total).toBe(2);
    expect((await searchService.searchBookmarks(uid, q({ folderId: dev.id, includeSubfolders: false }))).total).toBe(0);
    expect((await searchService.searchBookmarks(uid, q({ favorite: true }))).total).toBe(1);
    expect((await searchService.searchBookmarks(uid, q({ tag: ["FRONTEND"] }))).total).toBe(1);
    expect((await searchService.searchBookmarks(uid, q({ domain: "react.dev", favorite: true }))).total).toBe(1);
    const p = await searchService.searchBookmarks(uid, q({ pageSize: 2, page: 2, sort: "alpha" }));
    expect(p.total).toBe(4);
    expect(p.items).toHaveLength(2);
  });
  it("never leaks another user's bookmarks", async () => {
    expect((await searchService.searchBookmarks(userB, q({ q: "React" }))).total).toBe(0);
  });
});

describe("import", () => {
  const big = (folders: number, per: number, dupe = false) => {
    let html = "<DL><p>";
    for (let f = 0; f < folders; f++) {
      html += `<DT><H3>F${f}</H3><DL><p>`;
      for (let i = 0; i < per; i++) html += `<DT><A HREF="https://s${dupe ? 0 : f}.example/p/${i}" ADD_DATE="1700000000">P${f}-${i}</A>`;
      html += "</DL><p>";
    }
    return html + "</DL>";
  };

  it("imports 1,200 bookmarks, reports progress, preserves hierarchy (10 levels)", async () => {
    const uid = await newUser();
    try {
      let html = big(20, 60);
      let deep = "<DL><p>";
      for (let i = 1; i <= 10; i++) deep += `<DT><H3>Lvl${i}</H3><DL><p>`;
      deep += `<DT><A HREF="https://deepest.example/">Deepest</A>` + "</DL><p>".repeat(10) + "</DL>";
      html = html.replace(/<\/DL>$/, "") + deep.replace(/^<DL><p>/, "") + "</DL>";

      const preview = await previewImport(uid, html);
      expect(preview.stats.bookmarkCount).toBe(1201);
      expect(preview.stats.folderCount).toBe(30);
      expect(preview.stats.maxDepth).toBe(10);

      const progress: number[] = [];
      const summary = await runImport(uid, html, { skipDuplicates: true, mergeFolders: true, onProgress: (d) => progress.push(d) });
      expect(summary).toMatchObject({ bookmarksImported: 1201, foldersCreated: 30, duplicatesSkipped: 0 });
      expect(progress[0]).toBe(0);
      expect(progress.at(-1)).toBe(1201);

      const found = await searchService.searchBookmarks(uid, q({ q: "Deepest" }));
      expect(found.items[0].folderPath).toBe(Array.from({ length: 10 }, (_, i) => `Lvl${i + 1}`).join(" / "));
      expect((await searchService.searchBookmarks(uid, q({ pageSize: 100 }))).items).toHaveLength(100);
    } finally {
      await db.delete(users).where(eq(users.id, uid));
    }
  });

  it("skips duplicates (in file and in library) and merges folders on re-import", async () => {
    const uid = await newUser();
    try {
      const html = big(3, 10, true); // same URLs repeated across folders
      const first = await runImport(uid, html, { skipDuplicates: true, mergeFolders: true });
      expect(first.bookmarksImported).toBe(10);
      expect(first.duplicatesDetected).toBe(20);
      const second = await runImport(uid, html, { skipDuplicates: true, mergeFolders: true });
      expect(second).toMatchObject({ bookmarksImported: 0, foldersCreated: 0, foldersMerged: 3 });
      const kept = await runImport(uid, html, { skipDuplicates: false, mergeFolders: false });
      expect(kept.bookmarksImported).toBe(30);
      expect(kept.foldersCreated).toBe(3);
    } finally {
      await db.delete(users).where(eq(users.id, uid));
    }
  });

  it("is transactional: a failure imports nothing", async () => {
    const uid = await newUser();
    try {
      const html = `<DL><DT><H3>Only</H3><DL><DT><A HREF="https://ok.example">ok</A></DL></DL>`;
      await expect(runImport(uid, html, { skipDuplicates: true, mergeFolders: true, onProgress: (d) => { if (d > 0) throw new Error("boom"); } })).rejects.toThrow("boom");
      expect(await listFolders(uid)).toHaveLength(0);
      expect((await searchService.searchBookmarks(uid, q())).total).toBe(0);
    } finally {
      await db.delete(users).where(eq(users.id, uid));
    }
  });

  it("rejects non-bookmark files with a friendly error", async () => {
    await expect(previewImport(userA, "<p>nope</p>")).rejects.toThrow(/bookmarks export/);
  });

  it("export → import round trip preserves folders and bookmarks", async () => {
    const uid = await newUser();
    const uid2 = await newUser();
    try {
      await runImport(uid, big(4, 5), { skipDuplicates: true, mergeFolders: true });
      const html = await exportHtml(uid);
      const parsed = parseBookmarksHTML(html);
      expect(parsed.stats).toMatchObject({ bookmarkCount: 20, folderCount: 4 });
      const res = await runImport(uid2, html, { skipDuplicates: true, mergeFolders: true });
      expect(res.bookmarksImported).toBe(20);
    } finally {
      await db.delete(users).where(eq(users.id, uid));
      await db.delete(users).where(eq(users.id, uid2));
    }
  });
});
