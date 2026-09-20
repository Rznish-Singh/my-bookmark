"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/client/api";
import type { BookmarkDTO, FolderDTO, FolderNode, TagWithCount } from "@/lib/types";

export interface DialogState {
  bookmark: { mode: "add" | "edit"; bookmark?: BookmarkDTO; folderId?: string | null } | null;
  detail: BookmarkDTO | null;
  folder: { mode: "create" | "rename" | "move"; folder?: FolderDTO; parentId?: string | null } | null;
  move: BookmarkDTO | null;
  deleteBookmark: BookmarkDTO | null;
  deleteFolder: FolderDTO | null;
  search: boolean;
}

interface Ctx {
  user: { name: string; email: string };
  tree: FolderNode[];
  folders: FolderDTO[];
  tags: TagWithCount[];
  totalCount: number;
  dialogs: DialogState;
  setDialogs: React.Dispatch<React.SetStateAction<DialogState>>;
  openAddBookmark: (folderId?: string | null) => void;
  openEditBookmark: (b: BookmarkDTO) => void;
  openDetail: (b: BookmarkDTO) => void;
  openMove: (b: BookmarkDTO) => void;
  openSearch: () => void;
  openFolderDialog: (s: NonNullable<DialogState["folder"]>) => void;
  requestDeleteBookmark: (b: BookmarkDTO) => void;
  requestDeleteFolder: (f: FolderDTO) => void;
  setFavorite: (id: string, value: boolean) => Promise<BookmarkDTO>;
  moveBookmark: (b: { id: string }, folderId: string | null, folderName?: string) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  openBookmark: (b: BookmarkDTO) => void;
  refresh: () => void;
}

const LibraryContext = createContext<Ctx | null>(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}

function flatten(nodes: FolderNode[]): FolderDTO[] {
  return nodes.flatMap((n) => [{ id: n.id, parentId: n.parentId, name: n.name, position: n.position, bookmarkCount: n.bookmarkCount }, ...flatten(n.children)]);
}

const EMPTY: DialogState = { bookmark: null, detail: null, folder: null, move: null, deleteBookmark: null, deleteFolder: null, search: false };

export function LibraryProvider({ children, user, tree, tags, totalCount }: {
  children: React.ReactNode; user: Ctx["user"]; tree: FolderNode[]; tags: TagWithCount[]; totalCount: number;
}) {
  const router = useRouter();
  const [dialogs, setDialogs] = useState<DialogState>(EMPTY);
  const folders = useMemo(() => flatten(tree), [tree]);
  const refresh = useCallback(() => router.refresh(), [router]);

  const value = useMemo<Ctx>(() => ({
    user, tree, folders, tags, totalCount, dialogs, setDialogs, refresh,
    openAddBookmark: (folderId) => setDialogs((d) => ({ ...d, bookmark: { mode: "add", folderId } })),
    openEditBookmark: (bookmark) => setDialogs((d) => ({ ...d, detail: null, bookmark: { mode: "edit", bookmark } })),
    openDetail: (detail) => setDialogs((d) => ({ ...d, detail })),
    openMove: (move) => setDialogs((d) => ({ ...d, detail: null, move })),
    openSearch: () => setDialogs((d) => ({ ...d, search: true })),
    openFolderDialog: (folder) => setDialogs((d) => ({ ...d, folder })),
    requestDeleteBookmark: (deleteBookmark) => setDialogs((d) => ({ ...d, deleteBookmark })),
    requestDeleteFolder: (deleteFolder) => setDialogs((d) => ({ ...d, deleteFolder })),
    setFavorite: async (id, isFavorite) => {
      const updated = await api<BookmarkDTO>(`/api/bookmarks/${id}/favorite`, { method: "POST", body: { isFavorite } });
      router.refresh();
      return updated;
    },
    moveBookmark: async (b, folderId, folderName) => {
      try {
        await api(`/api/bookmarks/${b.id}/move`, { method: "POST", body: { folderId } });
        toast.success(folderName ? `Bookmark moved to ${folderName}` : "Bookmark moved to Library");
        router.refresh();
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    moveFolder: async (folderId, parentId) => {
      try {
        await api(`/api/folders/${folderId}`, { method: "PATCH", body: { parentId } });
        toast.success("Folder moved");
        router.refresh();
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    openBookmark: (b) => {
      window.open(b.url, "_blank", "noopener,noreferrer");
      void fetch(`/api/bookmarks/${b.id}/visit`, { method: "POST" }).catch(() => {});
    },
  }), [user, tree, folders, tags, totalCount, dialogs, refresh, router]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
