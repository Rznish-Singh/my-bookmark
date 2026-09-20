import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, folders, type BookmarkRow } from "@/lib/db/schema";
import { conflict, notFound } from "@/lib/errors";
import type { BookmarkDTO, DuplicateInfo } from "@/lib/types";
import { extractDomain, normalizeUrl } from "@/lib/utils/normalize-url";
import { buildPathMap, listFolders } from "./folder-service";
import { metadataService } from "./metadata-service";
import { setBookmarkTags, tagsForBookmarks } from "./tag-service";

export async function hydrate(userId: string, rows: BookmarkRow[]): Promise<BookmarkDTO[]> {
  if (rows.length === 0) return [];
  const [tagMap, folderList] = await Promise.all([tagsForBookmarks(rows.map((r) => r.id)), listFolders(userId)]);
  const paths = buildPathMap(folderList);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    domain: r.domain,
    description: r.description,
    notes: r.notes,
    faviconUrl: r.faviconUrl,
    thumbnailUrl: r.thumbnailUrl,
    isFavorite: r.isFavorite,
    visitCount: r.visitCount,
    folderId: r.folderId,
    folderPath: r.folderId ? (paths.get(r.folderId) ?? null) : null,
    tags: tagMap.get(r.id) ?? [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

async function assertFolderOwned(userId: string, folderId: string | null | undefined) {
  if (!folderId) return;
  const [f] = await db.select({ id: folders.id }).from(folders).where(and(eq(folders.id, folderId), eq(folders.userId, userId))).limit(1);
  if (!f) throw notFound("Folder");
}

async function getRow(userId: string, id: string): Promise<BookmarkRow> {
  const [row] = await db.select().from(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId))).limit(1);
  if (!row) throw notFound("Bookmark");
  return row;
}

export async function getBookmark(userId: string, id: string): Promise<BookmarkDTO> {
  return (await hydrate(userId, [await getRow(userId, id)]))[0];
}

export async function findDuplicate(userId: string, url: string, excludeId?: string): Promise<DuplicateInfo | null> {
  const normalized = normalizeUrl(url);
  const [row] = await db
    .select({ id: bookmarks.id, title: bookmarks.title, url: bookmarks.url, domain: bookmarks.domain })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.normalizedUrl, normalized),
        excludeId ? sql`${bookmarks.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  description?: string | null;
  notes?: string | null;
  folderId?: string | null;
  tags: string[];
  isFavorite: boolean;
  faviconUrl?: string | null;
  thumbnailUrl?: string | null;
  force: boolean;
}

export async function createBookmark(userId: string, input: CreateBookmarkInput): Promise<BookmarkDTO> {
  await assertFolderOwned(userId, input.folderId);
  if (!input.force) {
    const dup = await findDuplicate(userId, input.url);
    if (dup) throw conflict("This URL is already in your library.", { duplicate: dup });
  }

  let { title, description, faviconUrl, thumbnailUrl } = input;
  // Metadata is a convenience: failing to fetch it must never block saving.
  if (!title) {
    try {
      const meta = await metadataService.fetchMetadata(input.url);
      title = meta.title ?? undefined;
      description ??= meta.description;
      faviconUrl ??= meta.favicon;
      thumbnailUrl ??= meta.image;
    } catch {
      /* fall through to domain fallback */
    }
  }
  const domain = extractDomain(input.url);

  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(bookmarks)
      .values({
        userId,
        folderId: input.folderId ?? null,
        title: title || domain || input.url,
        url: input.url,
        normalizedUrl: normalizeUrl(input.url),
        domain,
        description: description || null,
        notes: input.notes || null,
        faviconUrl: faviconUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        isFavorite: input.isFavorite,
      })
      .returning();
    await setBookmarkTags(tx, userId, created.id, input.tags);
    return created;
  });
  return (await hydrate(userId, [row]))[0];
}

export interface UpdateBookmarkInput {
  url?: string;
  title?: string;
  description?: string | null;
  notes?: string | null;
  folderId?: string | null;
  tags?: string[];
  isFavorite?: boolean;
}

export async function updateBookmark(userId: string, id: string, input: UpdateBookmarkInput): Promise<BookmarkDTO> {
  const existing = await getRow(userId, id);
  if (input.folderId !== undefined) await assertFolderOwned(userId, input.folderId);
  const patch: Partial<typeof bookmarks.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.notes !== undefined) patch.notes = input.notes || null;
  if (input.folderId !== undefined) patch.folderId = input.folderId;
  if (input.isFavorite !== undefined) patch.isFavorite = input.isFavorite;
  if (input.url !== undefined && input.url !== existing.url) {
    patch.url = input.url;
    patch.normalizedUrl = normalizeUrl(input.url);
    patch.domain = extractDomain(input.url);
  }
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(bookmarks)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
      .returning();
    if (input.tags) await setBookmarkTags(tx, userId, id, input.tags);
    return updated;
  });
  return (await hydrate(userId, [row]))[0];
}

export async function deleteBookmark(userId: string, id: string) {
  const res = await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId))).returning({ id: bookmarks.id });
  if (res.length === 0) throw notFound("Bookmark");
}

export async function setFavorite(userId: string, id: string, value?: boolean): Promise<BookmarkDTO> {
  const existing = await getRow(userId, id);
  return updateBookmark(userId, id, { isFavorite: value ?? !existing.isFavorite });
}

export async function moveBookmark(userId: string, id: string, folderId: string | null): Promise<BookmarkDTO> {
  return updateBookmark(userId, id, { folderId });
}

export async function recordVisit(userId: string, id: string) {
  await db
    .update(bookmarks)
    .set({ visitCount: sql`${bookmarks.visitCount} + 1`, lastVisitedAt: new Date() })
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
}

export async function listDomains(userId: string): Promise<{ domain: string; count: number }[]> {
  return db
    .select({ domain: bookmarks.domain, count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .groupBy(bookmarks.domain)
    .orderBy(sql`2 desc`, bookmarks.domain)
    .limit(200);
}

export async function countBookmarks(userId: string): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(bookmarks).where(eq(bookmarks.userId, userId));
  return n;
}
