import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, folders } from "@/lib/db/schema";
import {
  type FolderTreeNode,
  type ParseResult,
  type ParseStats,
  BookmarkParseError,
  buildFolderTree,
  parseBookmarksHTML,
} from "@/lib/parsers/bookmark-html-parser";
import { badRequest } from "@/lib/errors";

const CHUNK = 500;
const MAX_URL = 4000;
const MAX_ICON = 10_000;

export interface ImportPreview {
  stats: ParseStats;
  /** Bookmarks that already exist in the library or appear earlier in the file. */
  duplicatesInLibrary: number;
  tree: FolderTreeNode[];
}

export interface ImportSummary {
  bookmarksImported: number;
  foldersCreated: number;
  foldersMerged: number;
  /** Total duplicates detected (in file + already in library). */
  duplicatesDetected: number;
  duplicatesSkipped: number;
  linksIgnored: number;
}

export function parseOrThrow(html: string): ParseResult {
  try {
    return parseBookmarksHTML(html);
  } catch (e) {
    if (e instanceof BookmarkParseError) throw badRequest(e.message);
    throw e;
  }
}

async function existingUrls(userId: string): Promise<Set<string>> {
  const rows = await db.select({ u: bookmarks.normalizedUrl }).from(bookmarks).where(eq(bookmarks.userId, userId));
  return new Set(rows.map((r) => r.u));
}

/** Marks which parsed bookmarks are duplicates, in file order. */
export function findDuplicateIndexes(parsed: ParseResult, existing: Set<string>) {
  const seen = new Set(existing);
  const dupes = new Set<number>();
  let inLibrary = 0;
  parsed.bookmarks.forEach((b, i) => {
    if (seen.has(b.normalizedUrl)) {
      dupes.add(i);
      if (existing.has(b.normalizedUrl)) inLibrary++;
    } else seen.add(b.normalizedUrl);
  });
  return { dupes, inLibrary };
}

export async function previewImport(userId: string, html: string): Promise<ImportPreview> {
  const parsed = parseOrThrow(html);
  const { dupes, inLibrary } = findDuplicateIndexes(parsed, await existingUrls(userId));
  return {
    stats: { ...parsed.stats, duplicateCount: dupes.size },
    duplicatesInLibrary: inLibrary,
    tree: buildFolderTree(parsed),
  };
}

export interface RunImportOptions {
  skipDuplicates: boolean;
  mergeFolders: boolean;
  onProgress?: (done: number, total: number) => void;
}

/** Imports everything in a single transaction: either it all lands or nothing does. */
export async function runImport(userId: string, html: string, opts: RunImportOptions): Promise<ImportSummary> {
  const parsed = parseOrThrow(html);
  const existing = await existingUrls(userId);
  const { dupes } = findDuplicateIndexes(parsed, existing);

  const toImport = parsed.bookmarks
    .map((b, i) => ({ b, i }))
    .filter(({ b, i }) => b.url.length <= MAX_URL && !(opts.skipDuplicates && dupes.has(i)));
  const total = toImport.length;

  return db.transaction(async (tx) => {
    // 1. Folders (parents always precede children in parse order).
    const idMap = new Map<string, string>(); // temp id -> real id
    const byKey = new Map<string, string>();
    if (opts.mergeFolders) {
      const rows = await tx.select().from(folders).where(eq(folders.userId, userId));
      for (const r of rows) byKey.set(`${r.parentId ?? ""}|${r.name.toLowerCase()}`, r.id);
    }
    const siblingCount = new Map<string, number>();
    const newFolders: (typeof folders.$inferInsert)[] = [];
    let merged = 0;
    for (const f of parsed.folders) {
      const parentReal = f.parentId ? (idMap.get(f.parentId) ?? null) : null;
      const key = `${parentReal ?? ""}|${f.name.toLowerCase()}`;
      const hit = opts.mergeFolders ? byKey.get(key) : undefined;
      if (hit) {
        idMap.set(f.id, hit);
        merged++;
        continue;
      }
      const id = randomUUID();
      const pos = siblingCount.get(parentReal ?? "") ?? 0;
      siblingCount.set(parentReal ?? "", pos + 1);
      idMap.set(f.id, id);
      byKey.set(key, id);
      newFolders.push({ id, userId, parentId: parentReal, name: f.name.slice(0, 120), position: pos });
    }
    for (let i = 0; i < newFolders.length; i += CHUNK) {
      await tx.insert(folders).values(newFolders.slice(i, i + CHUNK));
    }

    // 2. Bookmarks in chunks, reporting progress after each.
    opts.onProgress?.(0, total);
    let done = 0;
    const now = new Date();
    for (let i = 0; i < toImport.length; i += CHUNK) {
      const chunk = toImport.slice(i, i + CHUNK).map(({ b }) => ({
        userId,
        folderId: b.folderId ? (idMap.get(b.folderId) ?? null) : null,
        title: b.title.slice(0, 500),
        url: b.url,
        normalizedUrl: b.normalizedUrl,
        domain: b.domain,
        description: b.description,
        faviconUrl: b.icon && b.icon.length <= MAX_ICON ? b.icon : null,
        createdAt: b.addDate ?? now,
      }));
      await tx.insert(bookmarks).values(chunk);
      done += chunk.length;
      opts.onProgress?.(done, total);
    }

    return {
      bookmarksImported: done,
      foldersCreated: newFolders.length,
      foldersMerged: merged,
      duplicatesDetected: dupes.size,
      duplicatesSkipped: opts.skipDuplicates ? dupes.size : 0,
      linksIgnored: parsed.stats.skippedCount + (parsed.bookmarks.length - parsed.bookmarks.filter((b) => b.url.length <= MAX_URL).length),
    };
  });
}
