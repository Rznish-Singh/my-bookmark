"use client";
import { Bookmark, Clock, FolderOpen, Import, Plus, Star } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { useLibrary } from "@/components/layout/library-provider";
import { Button } from "@/components/ui/button";

export function LibraryEmpty({ kind, folderId }: { kind: "library" | "folder" | "favorites" | "recent" | "search"; folderId?: string }) {
  const { openAddBookmark } = useLibrary();
  if (kind === "library" || kind === "recent") {
    return (
      <EmptyState
        icon={kind === "recent" ? <Clock /> : <Bookmark />}
        title={kind === "recent" ? "Nothing added recently" : "Your library is empty."}
        description="Import your existing browser bookmarks or save your first link."
        actions={<><Button asChild><Link href="/dashboard/import"><Import /> Import Bookmarks</Link></Button><Button variant="outline" onClick={() => openAddBookmark()}><Plus /> Add Bookmark</Button></>}
      />
    );
  }
  if (kind === "folder") {
    return <EmptyState icon={<FolderOpen />} title="No bookmarks in this folder." description="Add a link here, or drag bookmarks onto this folder in the sidebar." actions={<Button onClick={() => openAddBookmark(folderId ?? null)}><Plus /> Add Bookmark</Button>} />;
  }
  if (kind === "favorites") {
    return <EmptyState icon={<Star />} title="No favorites yet." description="Star a bookmark to pin it here for quick access." actions={<Button variant="outline" asChild><Link href="/dashboard">Browse all bookmarks</Link></Button>} />;
  }
  return <EmptyState title="No bookmarks found." description="Try another keyword, or remove filters." />;
}
