"use client";
import { Folder, MoreHorizontal, Star } from "lucide-react";
import { useState } from "react";
import { BookmarkMenuItems } from "@/components/bookmarks/bookmark-actions";
import { Favicon } from "@/components/bookmarks/favicon";
import { useLibrary } from "@/components/layout/library-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/client/format";
import type { BookmarkDTO } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export const DRAG_TYPE = "application/x-bookmark-vault-bookmark";

export interface BookmarkItemProps {
  bookmark: BookmarkDTO;
  onFavorite: (b: BookmarkDTO) => void;
}

export function FavoriteButton({ b, onFavorite, className }: { b: BookmarkDTO; onFavorite: (b: BookmarkDTO) => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className={cn("relative z-10", className)}
      aria-label={b.isFavorite ? `Remove ${b.title} from favorites` : `Add ${b.title} to favorites`}
      aria-pressed={b.isFavorite}
      onClick={() => onFavorite(b)}
    >
      <Star className={cn(b.isFavorite ? "fill-star text-star" : "text-muted-foreground")} />
    </Button>
  );
}

export function MoreMenu({ b, onFavorite }: { b: BookmarkDTO; onFavorite: (b: BookmarkDTO) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" className="relative z-10" aria-label={`More actions for ${b.title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"><BookmarkMenuItems b={b} kind="dropdown" onFavorite={onFavorite} /></DropdownMenuContent>
    </DropdownMenu>
  );
}

function Tags({ b, max }: { b: BookmarkDTO; max: number }) {
  if (b.tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {b.tags.slice(0, max).map((t) => <Badge key={t.id}>#{t.name}</Badge>)}
      {b.tags.length > max && <Badge variant="outline">+{b.tags.length - max}</Badge>}
    </div>
  );
}

export function BookmarkCard({ bookmark: b, onFavorite }: BookmarkItemProps) {
  const lib = useLibrary();
  const [imgOk, setImgOk] = useState(true);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          draggable
          onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, b.id); e.dataTransfer.effectAllowed = "move"; }}
          className="group relative flex flex-col gap-2.5 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/25 hover:bg-card focus-within:border-foreground/25"
        >
          {b.thumbnailUrl && imgOk && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
            <img src={b.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} className="-mx-1 -mt-1 h-28 w-[calc(100%+0.5rem)] rounded-lg bg-muted object-cover" />
          )}
          <div className="flex items-center gap-2">
            <Favicon src={b.faviconUrl} domain={b.domain} />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{b.domain}</span>
            <div className="-mr-1.5 flex items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 has-[[aria-pressed=true]]:opacity-100">
              <FavoriteButton b={b} onFavorite={onFavorite} />
              <MoreMenu b={b} onFavorite={onFavorite} />
            </div>
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => lib.openDetail(b)}
              className="line-clamp-2 text-left text-[15px] font-medium leading-snug tracking-tight outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {b.title}
            </button>
            {b.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{b.description}</p>}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-1">
            {b.folderPath && (
              <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Folder className="size-3.5 shrink-0" /><span className="truncate">{b.folderPath}</span></span>
            )}
            <Tags b={b} max={3} />
          </div>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent><BookmarkMenuItems b={b} kind="context" onFavorite={onFavorite} /></ContextMenuContent>
    </ContextMenu>
  );
}

export function BookmarkRow({ bookmark: b, onFavorite }: BookmarkItemProps) {
  const lib = useLibrary();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          draggable
          onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, b.id); e.dataTransfer.effectAllowed = "move"; }}
          className="group relative flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-border hover:bg-card focus-within:border-border focus-within:bg-card"
        >
          <Favicon src={b.faviconUrl} domain={b.domain} />
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <button
              type="button"
              onClick={() => lib.openDetail(b)}
              className="truncate text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {b.title}
            </button>
            <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{b.domain}</span>
          </div>
          {b.folderPath && <span className="hidden max-w-52 shrink-0 items-center gap-1.5 truncate text-xs text-muted-foreground lg:flex"><Folder className="size-3.5 shrink-0" /><span className="truncate">{b.folderPath}</span></span>}
          <div className="hidden shrink-0 md:block"><Tags b={b} max={2} /></div>
          <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground xl:block">{timeAgo(b.createdAt)}</span>
          <div className="flex shrink-0 items-center"><FavoriteButton b={b} onFavorite={onFavorite} /><MoreMenu b={b} onFavorite={onFavorite} /></div>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent><BookmarkMenuItems b={b} kind="context" onFavorite={onFavorite} /></ContextMenuContent>
    </ContextMenu>
  );
}
