import { Parser } from "htmlparser2";
import { extractDomain, isHttpUrl, normalizeUrl } from "@/lib/utils/normalize-url";

/**
 * Parser for Netscape-format bookmark exports (Chrome, Firefox, Edge, Safari).
 *
 * The format nests folders like this (closing tags are frequently missing):
 *
 *   <DL><p>
 *     <DT><H3>Folder</H3>
 *     <DL><p>
 *       <DT><A HREF="https://example.com">Example</A>
 *     </DL><p>
 *   </DL><p>
 *
 * We walk the token stream keeping a stack of "current folder" ids, pushing one
 * whenever a <DL> follows an <H3>. Every bookmark is attached to the folder on
 * top of the stack, which preserves the exact hierarchy.
 */

export interface ParsedFolder {
  /** Temporary id, unique within a parse result ("f1", "f2", ...). */
  id: string;
  name: string;
  parentId: string | null;
  /** Ids of direct child folders. */
  children: string[];
  depth: number;
}

export interface ParsedBookmark {
  title: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  /** Temporary folder id, or null when the bookmark sits at the root. */
  folderId: string | null;
  addDate: Date | null;
  /** Inline favicon (data: URI) or remote icon URL, when the export includes one. */
  icon: string | null;
  description: string | null;
}

export interface DuplicateGroup {
  normalizedUrl: string;
  /** Indexes into `bookmarks`. */
  indexes: number[];
}

export interface ParseStats {
  bookmarkCount: number;
  folderCount: number;
  nestedFolderCount: number;
  maxDepth: number;
  /** Number of redundant copies (a URL saved 3 times counts as 2). */
  duplicateCount: number;
  /** Links ignored because they are not http(s), e.g. javascript: or place: */
  skippedCount: number;
}

export interface ParseResult {
  folders: ParsedFolder[];
  bookmarks: ParsedBookmark[];
  duplicates: DuplicateGroup[];
  stats: ParseStats;
}

export interface FolderTreeNode extends Omit<ParsedFolder, "children"> {
  children: FolderTreeNode[];
  bookmarkCount: number;
}

export class BookmarkParseError extends Error {}

const UNTITLED_FOLDER = "Untitled folder";

export function parseBookmarkTimestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Chrome/Firefox use seconds; some exports use ms or µs.
  const ms = n > 1e14 ? n / 1000 : n > 1e11 ? n : n * 1000;
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  return year >= 1990 && year <= 2100 ? date : null;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseBookmarksHTML(html: string): ParseResult {
  if (!/<dl[\s>]/i.test(html) && !/<a[\s>]/i.test(html)) {
    throw new BookmarkParseError("This file does not look like a browser bookmarks export.");
  }

  const folders: ParsedFolder[] = [];
  const folderById = new Map<string, ParsedFolder>();
  const bookmarks: ParsedBookmark[] = [];
  let skipped = 0;
  let folderSeq = 0;

  // Stack of folder ids for each open <DL>. `null` = library root.
  const stack: Array<string | null> = [null];
  let pendingFolderId: string | null = null;
  let dlDepth = 0;

  let h3: { text: string } | null = null;
  let anchor: { attrs: Record<string, string>; text: string; folderId: string | null } | null = null;
  let dd: { text: string; target: ParsedBookmark | null } | null = null;
  let lastBookmark: ParsedBookmark | null = null;

  const currentFolder = () => stack[stack.length - 1];

  function finishH3() {
    if (!h3) return;
    const parentId = currentFolder();
    const parent = parentId ? folderById.get(parentId) : undefined;
    const folder: ParsedFolder = {
      id: `f${++folderSeq}`,
      name: cleanText(h3.text) || UNTITLED_FOLDER,
      parentId,
      children: [],
      depth: parent ? parent.depth + 1 : 0,
    };
    folders.push(folder);
    folderById.set(folder.id, folder);
    parent?.children.push(folder.id);
    pendingFolderId = folder.id;
    h3 = null;
  }

  function finishAnchor() {
    if (!anchor) return;
    const { attrs, text, folderId } = anchor;
    anchor = null;
    const href = (attrs.href ?? "").trim();
    if (!href || !isHttpUrl(href)) {
      skipped++;
      lastBookmark = null;
      return;
    }
    const title = cleanText(text) || extractDomain(href) || href;
    const bookmark: ParsedBookmark = {
      title,
      url: href,
      normalizedUrl: normalizeUrl(href),
      domain: extractDomain(href),
      folderId,
      addDate: parseBookmarkTimestamp(attrs.add_date),
      icon: attrs.icon?.trim() || attrs.icon_uri?.trim() || null,
      description: null,
    };
    bookmarks.push(bookmark);
    lastBookmark = bookmark;
  }

  function finishDd() {
    if (!dd) return;
    const text = cleanText(dd.text);
    if (dd.target && text) dd.target.description = text.slice(0, 2000);
    dd = null;
  }

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        switch (name) {
          case "dl": {
            finishAnchor();
            finishH3();
            finishDd();
            stack.push(pendingFolderId ?? currentFolder());
            pendingFolderId = null;
            dlDepth++;
            break;
          }
          case "h3": {
            finishAnchor();
            finishH3();
            finishDd();
            pendingFolderId = null;
            h3 = { text: "" };
            break;
          }
          case "a": {
            finishAnchor();
            finishH3();
            finishDd();
            pendingFolderId = null;
            anchor = { attrs, text: "", folderId: currentFolder() };
            break;
          }
          case "dt": {
            finishAnchor();
            finishH3();
            finishDd();
            // An <H3> not followed by a <DL> is an empty folder with no contents.
            pendingFolderId = null;
            break;
          }
          case "dd": {
            finishAnchor();
            finishH3();
            dd = { text: "", target: lastBookmark };
            break;
          }
          default:
            break;
        }
      },
      ontext(text) {
        if (h3) h3.text += text;
        else if (anchor) anchor.text += text;
        else if (dd) dd.text += text;
      },
      onclosetag(name) {
        switch (name) {
          case "h3":
            finishH3();
            break;
          case "a":
            finishAnchor();
            break;
          case "dd":
            finishDd();
            break;
          case "dl": {
            finishAnchor();
            finishH3();
            finishDd();
            if (dlDepth > 0) {
              dlDepth--;
              if (stack.length > 1) stack.pop();
            }
            break;
          }
          default:
            break;
        }
      },
      onend() {
        finishAnchor();
        finishH3();
        finishDd();
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );

  parser.write(html);
  parser.end();

  if (bookmarks.length === 0 && folders.length === 0) {
    throw new BookmarkParseError("No bookmarks were found in this file.");
  }

  // Group duplicates by normalized URL.
  const byUrl = new Map<string, number[]>();
  bookmarks.forEach((b, i) => {
    const list = byUrl.get(b.normalizedUrl);
    if (list) list.push(i);
    else byUrl.set(b.normalizedUrl, [i]);
  });
  const duplicates: DuplicateGroup[] = [];
  let duplicateCount = 0;
  for (const [normalizedUrl, indexes] of byUrl) {
    if (indexes.length > 1) {
      duplicates.push({ normalizedUrl, indexes });
      duplicateCount += indexes.length - 1;
    }
  }

  return {
    folders,
    bookmarks,
    duplicates,
    stats: {
      bookmarkCount: bookmarks.length,
      folderCount: folders.length,
      nestedFolderCount: folders.filter((f) => f.parentId !== null).length,
      maxDepth: folders.reduce((m, f) => Math.max(m, f.depth + 1), 0),
      duplicateCount,
      skippedCount: skipped,
    },
  };
}

/** Builds a nested tree (with per-folder bookmark counts) for previews. */
export function buildFolderTree(result: Pick<ParseResult, "folders" | "bookmarks">): FolderTreeNode[] {
  const counts = new Map<string, number>();
  for (const b of result.bookmarks) {
    if (b.folderId) counts.set(b.folderId, (counts.get(b.folderId) ?? 0) + 1);
  }
  const nodes = new Map<string, FolderTreeNode>();
  for (const f of result.folders) {
    nodes.set(f.id, { ...f, children: [], bookmarkCount: counts.get(f.id) ?? 0 });
  }
  const roots: FolderTreeNode[] = [];
  for (const f of result.folders) {
    const node = nodes.get(f.id)!;
    const parent = f.parentId ? nodes.get(f.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
