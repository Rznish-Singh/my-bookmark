import { type SQL, and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarkTags, bookmarks, tags } from "@/lib/db/schema";
import type { BookmarkPage } from "@/lib/types";
import type { ListQuery } from "@/lib/validators/bookmark";
import { hydrate } from "./bookmark-service";
import { descendantIds, listFolders } from "./folder-service";

/**
 * The UI and API only talk to this interface. Swap PostgresSearchService for an
 * ElasticSearchService later (fed by an outbox + queue) without touching callers.
 */
export interface SearchService {
  searchBookmarks(userId: string, query: ListQuery): Promise<BookmarkPage>;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const RANGE_DAYS: Record<NonNullable<ListQuery["range"]>, number> = { "7d": 7, "30d": 30, "90d": 90, year: 365 };

export class PostgresSearchService implements SearchService {
  async searchBookmarks(userId: string, q: ListQuery): Promise<BookmarkPage> {
    const conditions: (SQL | undefined)[] = [eq(bookmarks.userId, userId)];

    if (q.unfiled) conditions.push(sql`${bookmarks.folderId} is null`);
    else if (q.folderId) {
      const ids = q.includeSubfolders ? [q.folderId, ...descendantIds(await listFolders(userId), q.folderId)] : [q.folderId];
      conditions.push(inArray(bookmarks.folderId, ids));
    }
    if (q.favorite !== undefined) conditions.push(eq(bookmarks.isFavorite, q.favorite));
    if (q.domain) conditions.push(eq(bookmarks.domain, q.domain.toLowerCase()));
    if (q.range) conditions.push(gte(bookmarks.createdAt, new Date(Date.now() - RANGE_DAYS[q.range] * 86_400_000)));

    for (const tag of q.tag) {
      conditions.push(sql`exists (
        select 1 from ${bookmarkTags} bt join ${tags} t on t.id = bt.tag_id
        where bt.bookmark_id = ${bookmarks.id} and lower(t.name) = ${tag.toLowerCase()})`);
    }

    const tokens = (q.q ?? "").split(/\s+/).filter(Boolean).slice(0, 6);
    // Folder-name matches include everything nested inside the matching folder.
    const allFolders = tokens.length ? await listFolders(userId) : [];
    for (const token of tokens) {
      const lower = token.toLowerCase();
      const matched = allFolders.filter((f) => f.name.toLowerCase().includes(lower)).map((f) => f.id);
      const folderIds = [...new Set(matched.flatMap((id) => [id, ...descendantIds(allFolders, id)]))];
      const pattern = `%${escapeLike(token)}%`;
      conditions.push(
        or(
          ilike(bookmarks.title, pattern),
          ilike(bookmarks.url, pattern),
          ilike(bookmarks.domain, pattern),
          ilike(bookmarks.description, pattern),
          ilike(bookmarks.notes, pattern),
          sql`exists (select 1 from ${bookmarkTags} bt join ${tags} t on t.id = bt.tag_id
                where bt.bookmark_id = ${bookmarks.id} and t.name ilike ${pattern})`,
          folderIds.length ? inArray(bookmarks.folderId, folderIds) : undefined,
        ),
      );
    }
    const where = and(...conditions);

    const sortMap = {
      newest: [desc(bookmarks.createdAt)],
      oldest: [asc(bookmarks.createdAt)],
      alpha: [asc(sql`lower(${bookmarks.title})`)],
      updated: [desc(bookmarks.updatedAt)],
      domain: [asc(bookmarks.domain), asc(sql`lower(${bookmarks.title})`)],
      visits: [desc(bookmarks.visitCount), desc(bookmarks.createdAt)],
    } as const;
    const relevance = tokens.length
      ? [desc(sql`(${bookmarks.title} ilike ${`%${escapeLike(tokens[0])}%`})::int`)]
      : [];

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(bookmarks)
        .where(where)
        .orderBy(...relevance, ...sortMap[q.sort], asc(bookmarks.id))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(bookmarks).where(where),
    ]);

    return { items: await hydrate(userId, rows), total, page: q.page, pageSize: q.pageSize };
  }
}

export const searchService: SearchService = new PostgresSearchService();
