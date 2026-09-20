import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, folders } from "@/lib/db/schema";
import { badRequest, notFound } from "@/lib/errors";
import type { FolderDTO, FolderNode } from "@/lib/types";

/** Pure helpers (unit-tested without a database). */

export function buildTree(list: FolderDTO[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>();
  for (const f of list) nodes.set(f.id, { ...f, children: [], totalCount: f.bookmarkCount });
  const roots: FolderNode[] = [];
  for (const f of list) {
    const node = nodes.get(f.id)!;
    const parent = f.parentId ? nodes.get(f.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sortRec = (arr: FolderNode[]) => {
    arr.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    arr.forEach((n) => sortRec(n.children));
  };
  const total = (n: FolderNode): number => (n.totalCount = n.bookmarkCount + n.children.reduce((s, c) => s + total(c), 0));
  sortRec(roots);
  roots.forEach(total);
  return roots;
}

export { buildPathMap, descendantIds, wouldCreateCycle } from "./folder-path";
import { descendantIds, wouldCreateCycle } from "./folder-path";

/** Data access. Every function is scoped by userId. */

export async function listFolders(userId: string): Promise<FolderDTO[]> {
  // Left join + group by (a correlated subquery would render folders.id unqualified and mis-resolve).
  return db
    .select({
      id: folders.id,
      parentId: folders.parentId,
      name: folders.name,
      position: folders.position,
      bookmarkCount: sql<number>`count(${bookmarks.id})::int`,
    })
    .from(folders)
    .leftJoin(bookmarks, eq(bookmarks.folderId, folders.id))
    .where(eq(folders.userId, userId))
    .groupBy(folders.id);
}

export async function getFolderTree(userId: string): Promise<FolderNode[]> {
  return buildTree(await listFolders(userId));
}

async function assertOwned(userId: string, folderId: string) {
  const [row] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Folder");
}

export async function createFolder(userId: string, input: { name: string; parentId?: string | null }) {
  if (input.parentId) await assertOwned(userId, input.parentId);
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${folders.position}), -1)::int + 1` })
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        input.parentId ? eq(folders.parentId, input.parentId) : sql`${folders.parentId} is null`,
      ),
    );
  const [row] = await db
    .insert(folders)
    .values({ userId, name: input.name, parentId: input.parentId ?? null, position: next })
    .returning();
  return row;
}

export async function updateFolder(userId: string, id: string, input: { name?: string; parentId?: string | null }) {
  await assertOwned(userId, id);
  const patch: Partial<typeof folders.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.parentId !== undefined) {
    if (input.parentId) await assertOwned(userId, input.parentId);
    const all = await listFolders(userId);
    if (wouldCreateCycle(all, id, input.parentId)) {
      throw badRequest("A folder can't be moved into itself or one of its subfolders.");
    }
    patch.parentId = input.parentId;
  }
  if (Object.keys(patch).length === 0) return (await db.select().from(folders).where(eq(folders.id, id)))[0];
  const [row] = await db.update(folders).set(patch).where(and(eq(folders.id, id), eq(folders.userId, userId))).returning();
  return row;
}

export async function getDeleteImpact(userId: string, id: string) {
  await assertOwned(userId, id);
  const all = await listFolders(userId);
  const ids = [id, ...descendantIds(all, id)];
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.folderId, ids)));
  return { bookmarkCount: count, subfolderCount: ids.length - 1 };
}

/**
 * Deletes a folder. Bookmarks are never removed silently:
 *  - delete_all:     folder, subfolders and every bookmark inside them are removed
 *  - move_to_parent: bookmarks and subfolders move up one level, then the folder is removed
 */
export async function deleteFolder(userId: string, id: string, strategy: "delete_all" | "move_to_parent") {
  await assertOwned(userId, id);
  return db.transaction(async (tx) => {
    const all = await tx
      .select({ id: folders.id, parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.userId, userId));
    const self = all.find((f) => f.id === id)!;
    if (strategy === "delete_all") {
      const ids = [id, ...descendantIds(all, id)];
      const removed = await tx
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.folderId, ids)))
        .returning({ id: bookmarks.id });
      await tx.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
      return { deletedBookmarks: removed.length, movedBookmarks: 0 };
    }
    const moved = await tx
      .update(bookmarks)
      .set({ folderId: self.parentId })
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.folderId, id)))
      .returning({ id: bookmarks.id });
    await tx
      .update(folders)
      .set({ parentId: self.parentId })
      .where(and(eq(folders.userId, userId), eq(folders.parentId, id)));
    await tx.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
    return { deletedBookmarks: 0, movedBookmarks: moved.length };
  });
}
