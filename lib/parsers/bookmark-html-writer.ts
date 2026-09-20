/** Writes the Netscape bookmark format that every major browser can import. */

export interface ExportFolder {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
}
export interface ExportBookmark {
  title: string;
  url: string;
  folderId: string | null;
  createdAt: Date;
  description?: string | null;
  faviconUrl?: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ts = (d: Date) => Math.floor(d.getTime() / 1000);

export function buildBookmarksHtml(folders: ExportFolder[], bookmarks: ExportBookmark[]): string {
  const childrenOf = new Map<string | null, ExportFolder[]>();
  for (const f of folders) {
    const list = childrenOf.get(f.parentId) ?? [];
    list.push(f);
    childrenOf.set(f.parentId, list);
  }
  const bookmarksIn = new Map<string | null, ExportBookmark[]>();
  for (const b of bookmarks) {
    const list = bookmarksIn.get(b.folderId) ?? [];
    list.push(b);
    bookmarksIn.set(b.folderId, list);
  }

  const lines: string[] = [];
  const writeBookmark = (b: ExportBookmark, indent: string) => {
    lines.push(`${indent}<DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${ts(b.createdAt)}">${escapeHtml(b.title)}</A>`);
    if (b.description) lines.push(`${indent}<DD>${escapeHtml(b.description)}`);
  };
  const writeLevel = (parentId: string | null, depth: number, visited: Set<string>) => {
    const indent = "    ".repeat(depth);
    for (const f of childrenOf.get(parentId) ?? []) {
      if (visited.has(f.id)) continue; // defensive: never loop on bad data
      visited.add(f.id);
      lines.push(`${indent}<DT><H3 ADD_DATE="${ts(f.createdAt)}">${escapeHtml(f.name)}</H3>`);
      lines.push(`${indent}<DL><p>`);
      writeLevel(f.id, depth + 1, visited);
      lines.push(`${indent}</DL><p>`);
    }
    for (const b of bookmarksIn.get(parentId) ?? []) writeBookmark(b, indent);
  };

  lines.push(
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  );
  writeLevel(null, 1, new Set());
  lines.push("</DL><p>");
  return lines.join("\n") + "\n";
}
