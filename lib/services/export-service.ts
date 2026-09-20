import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, folders } from "@/lib/db/schema";
import { buildBookmarksHtml } from "@/lib/parsers/bookmark-html-writer";
import { hydrate } from "./bookmark-service";

async function load(userId: string) {
  const [f, b] = await Promise.all([
    db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.position), asc(folders.name)),
    db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(asc(bookmarks.createdAt)),
  ]);
  return { f, b };
}

export async function exportHtml(userId: string): Promise<string> {
  const { f, b } = await load(userId);
  return buildBookmarksHtml(
    f.map((x) => ({ id: x.id, parentId: x.parentId, name: x.name, createdAt: x.createdAt })),
    b.map((x) => ({ title: x.title, url: x.url, folderId: x.folderId, createdAt: x.createdAt, description: x.description })),
  );
}

export async function exportJson(userId: string): Promise<string> {
  const { f, b } = await load(userId);
  const items = await hydrate(userId, b);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      folders: f.map((x) => ({ id: x.id, parentId: x.parentId, name: x.name, position: x.position })),
      bookmarks: items.map((x) => ({
        title: x.title, url: x.url, description: x.description, notes: x.notes, folderId: x.folderId,
        folderPath: x.folderPath, tags: x.tags.map((t) => t.name), isFavorite: x.isFavorite, createdAt: x.createdAt,
      })),
    },
    null,
    2,
  );
}
