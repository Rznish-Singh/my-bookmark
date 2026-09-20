import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { bookmarkTags, tags } from "@/lib/db/schema";
import { conflict, notFound } from "@/lib/errors";
import type { TagWithCount } from "@/lib/types";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0] | Db;

export async function listTags(userId: string): Promise<TagWithCount[]> {
  return db
    .select({ id: tags.id, name: tags.name, count: sql<number>`count(${bookmarkTags.bookmarkId})::int` })
    .from(tags)
    .leftJoin(bookmarkTags, eq(bookmarkTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(sql`count(${bookmarkTags.bookmarkId}) desc`, tags.name);
}

export async function createTag(userId: string, name: string) {
  const [row] = await db.insert(tags).values({ userId, name }).onConflictDoNothing().returning();
  if (row) return row;
  const [existing] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = lower(${name})`));
  return existing;
}

export async function renameTag(userId: string, id: string, name: string) {
  const [dupe] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = lower(${name})`, sql`${tags.id} <> ${id}`));
  if (dupe) throw conflict("A tag with that name already exists.");
  const [row] = await db.update(tags).set({ name }).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning();
  if (!row) throw notFound("Tag");
  return row;
}

export async function deleteTag(userId: string, id: string) {
  const res = await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId))).returning({ id: tags.id });
  if (res.length === 0) throw notFound("Tag");
}

export function cleanTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = raw.trim().replace(/^#/, "").replace(/\s+/g, " ");
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n.slice(0, 40));
    }
  }
  return out;
}

/** Replaces the tag set of a bookmark. Creates missing tags. Caller verifies bookmark ownership. */
export async function setBookmarkTags(tx: Tx, userId: string, bookmarkId: string, names: string[]) {
  const clean = cleanTagNames(names);
  await tx.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, bookmarkId));
  if (clean.length === 0) return;
  await tx.insert(tags).values(clean.map((name) => ({ userId, name }))).onConflictDoNothing();
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(sql`lower(${tags.name})`, clean.map((n) => n.toLowerCase()))));
  await tx.insert(bookmarkTags).values(rows.map((r) => ({ bookmarkId, tagId: r.id }))).onConflictDoNothing();
}

export async function tagsForBookmarks(ids: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const map = new Map<string, { id: string; name: string }[]>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ bookmarkId: bookmarkTags.bookmarkId, id: tags.id, name: tags.name })
    .from(bookmarkTags)
    .innerJoin(tags, eq(tags.id, bookmarkTags.tagId))
    .where(inArray(bookmarkTags.bookmarkId, ids))
    .orderBy(tags.name);
  for (const r of rows) map.set(r.bookmarkId, [...(map.get(r.bookmarkId) ?? []), { id: r.id, name: r.name }]);
  return map;
}

