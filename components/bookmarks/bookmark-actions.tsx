"use client";
import { ExternalLink, FolderInput, Info, Link2, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/components/layout/library-provider";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/client/api";
import type { BookmarkDTO } from "@/lib/types";

/** One set of actions rendered inside either a dropdown (⋯ button) or a right-click context menu. */
export function BookmarkMenuItems({ b, kind, onFavorite }: { b: BookmarkDTO; kind: "dropdown" | "context"; onFavorite?: (b: BookmarkDTO) => void }) {
  const lib = useLibrary();
  const Item = kind === "dropdown" ? DropdownMenuItem : ContextMenuItem;
  const Sep = kind === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(b.url);
      toast.success("URL copied");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <Item onSelect={() => lib.openBookmark(b)}><ExternalLink /> Open in new tab</Item>
      <Item onSelect={() => lib.openDetail(b)}><Info /> View details</Item>
      <Item onSelect={() => onFavorite?.(b)}><Star /> {b.isFavorite ? "Remove from favorites" : "Add to favorites"}</Item>
      <Sep />
      <Item onSelect={() => lib.openEditBookmark(b)}><Pencil /> Edit</Item>
      <Item onSelect={() => lib.openMove(b)}><FolderInput /> Move to folder…</Item>
      <Item onSelect={copy}><Link2 /> Copy URL</Item>
      <Sep />
      <Item variant="destructive" onSelect={() => lib.requestDeleteBookmark(b)}><Trash2 /> Delete</Item>
    </>
  );
}
