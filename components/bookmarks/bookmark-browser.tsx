"use client";
import { ArrowDownUp, ChevronLeft, ChevronRight, LayoutGrid, List, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { setViewCookie } from "@/lib/client/use-stored-flag";
import { toast } from "sonner";
import { BookmarkCard, BookmarkRow } from "@/components/bookmarks/bookmark-card";
import { useLibrary } from "@/components/layout/library-provider";
import { ActiveFilterBadges, SearchFilters } from "@/components/search/search-filters";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/client/api";
import { plural } from "@/lib/client/format";
import { useDebounce } from "@/lib/client/use-debounce";
import { useQueryParams } from "@/lib/client/use-query-params";
import type { BookmarkDTO, BookmarkPage, SortKey } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const SORTS: Record<SortKey, string> = {
  newest: "Recently added", oldest: "Oldest", alpha: "Alphabetical", updated: "Recently updated", domain: "Domain", visits: "Most visited",
};

export type ViewMode = "grid" | "list";

export function BookmarkBrowser({ page, view: initialView, domains, hideFolderFilter, paginate = true, empty, lockSort }: {
  page: BookmarkPage;
  view: ViewMode;
  domains: { domain: string; count: number }[];
  hideFolderFilter?: boolean;
  paginate?: boolean;
  /** Shown when there are no results and no search/filters are active. */
  empty: React.ReactNode;
  lockSort?: boolean;
}) {
  const lib = useLibrary();
  const { params, set, pending } = useQueryParams();
  const [items, setItems] = useState(page.items);
  const [view, setView] = useState<ViewMode>(initialView);
  // Adopt fresh server data when it arrives (derive state during render, not in an effect).
  const [seenItems, setSeenItems] = useState(page.items);
  if (seenItems !== page.items) { setSeenItems(page.items); setItems(page.items); }

  // Debounced search box that writes to the URL.
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const debounced = useDebounce(q, 300);
  const [lastSent, setLastSent] = useState(urlQ);
  // URL changed from outside (back button, clear filters): reflect it in the box.
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (seenUrlQ !== urlQ) { setSeenUrlQ(urlQ); setLastSent(urlQ); setQ(urlQ); }
  const setRef = useRef(set);
  useEffect(() => { setRef.current = set; });
  useEffect(() => {
    if (debounced !== lastSent) {
      setRef.current({ q: debounced.trim() || null });
    }
  }, [debounced, lastSent]);

  const sort = (params.get("sort") as SortKey) || "newest";
  const filtersActive = ["q", "folderId", "tag", "domain", "favorite", "range"].some((k) => params.has(k) && (hideFolderFilter ? k !== "folderId" : true));

  const changeView = (v: ViewMode) => {
    setView(v);
    setViewCookie(v);
  };

  const onFavorite = async (b: BookmarkDTO) => {
    const next = !b.isFavorite;
    setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, isFavorite: next } : x)));
    try {
      await lib.setFavorite(b.id, next);
      toast.success(next ? "Added to favorites" : "Removed from favorites");
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, isFavorite: b.isFavorite } : x)));
      toast.error(errorMessage(e));
    }
  };

  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.total, from + items.length - 1);
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookmarks…" aria-label="Search bookmarks" className="pl-9 pr-8" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <SearchFilters domains={domains} hideFolder={hideFolderFilter} />
        {!lockSort && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><ArrowDownUp /> <span className="hidden sm:inline">{SORTS[sort]}</span><span className="sm:hidden">Sort</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => set({ sort: v === "newest" ? null : v })}>
                {(Object.keys(SORTS) as SortKey[]).map((k) => <DropdownMenuRadioItem key={k} value={k}>{SORTS[k]}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="flex rounded-md border border-input bg-card p-0.5" role="group" aria-label="View">
          {([["grid", LayoutGrid, "Grid view"], ["list", List, "List view"]] as const).map(([v, Icon, label]) => (
            <Button key={v} variant="ghost" size="icon-xs" aria-label={label} aria-pressed={view === v} onClick={() => changeView(v)} className={cn(view === v && "bg-muted")}>
              <Icon />
            </Button>
          ))}
        </div>
      </div>

      <ActiveFilterBadges hideFolder={hideFolderFilter} />

      {items.length === 0 ? (
        filtersActive ? (
          <div className="rounded-xl border border-dashed px-6 py-14 text-center">
            <h2 className="text-base font-semibold">No bookmarks found</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Try another keyword, or remove some filters.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQ(""); set({ q: null, folderId: hideFolderFilter ? undefined : null, tag: [], domain: null, favorite: null, range: null }); }}>
              Clear search and filters
            </Button>
          </div>
        ) : empty
      ) : (
        <div className={cn("transition-opacity", pending && "opacity-60")}>
          {view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((b) => <BookmarkCard key={b.id} bookmark={b} onFavorite={onFavorite} />)}
            </div>
          ) : (
            <div className="flex flex-col">{items.map((b) => <BookmarkRow key={b.id} bookmark={b} onFavorite={onFavorite} />)}</div>
          )}
        </div>
      )}

      {paginate && page.total > 0 && items.length > 0 && (
        <nav className="flex items-center justify-between pt-2 text-sm text-muted-foreground" aria-label="Pagination">
          <span>Showing {from.toLocaleString()}–{to.toLocaleString()} of {plural(page.total, "bookmark")}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => set({ page: String(page.page - 1) }, { keepPage: true })}><ChevronLeft /> Previous</Button>
            <span className="px-2 text-xs">Page {page.page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page.page >= pages} onClick={() => set({ page: String(page.page + 1) }, { keepPage: true })}>Next <ChevronRight /></Button>
          </div>
        </nav>
      )}
    </div>
  );
}
