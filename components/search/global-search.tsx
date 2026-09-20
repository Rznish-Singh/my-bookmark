"use client";
import { CornerDownLeft, FolderPlus, History, Import, Plus, Star, Tags, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Favicon } from "@/components/bookmarks/favicon";
import { useLibrary } from "@/components/layout/library-provider";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client/api";
import { useDebounce } from "@/lib/client/use-debounce";
import type { BookmarkPage } from "@/lib/types";

const RECENT_KEY = "bv:recent-searches";

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...loadRecent().filter((x) => x !== q)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = query.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length === 0) return <>{text}</>;
  const parts = text.split(new RegExp(`(${tokens.join("|")})`, "ig"));
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded-sm bg-primary/20 text-inherit">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export function GlobalSearch() {
  const lib = useLibrary();
  const open = lib.dialogs.search;
  return (
    <CommandDialog open={open} onOpenChange={(o) => lib.setDialogs((d) => ({ ...d, search: o }))} title="Search bookmarks" commandProps={{ shouldFilter: false, loop: true }}>
      {open && <SearchBody />}
    </CommandDialog>
  );
}

// Mounted only while the palette is open, so query/results reset for free on every open.
function SearchBody() {
  const lib = useLibrary();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 250);
  const [fetched, setFetched] = useState<{ q: string; page: BookmarkPage } | null>(null);
  const [recent] = useState(loadRecent);

  useEffect(() => {
    if (!debounced) return;
    let live = true;
    api<BookmarkPage>(`/api/search?q=${encodeURIComponent(debounced)}&pageSize=8`)
      .then((page) => live && setFetched({ q: debounced, page }))
      .catch(() => live && setFetched({ q: debounced, page: { items: [], total: 0, page: 1, pageSize: 8 } }));
    return () => { live = false; };
  }, [debounced]);

  const results = debounced && fetched ? fetched.page : null;
  const loading = !!debounced && fetched?.q !== debounced;

  const close = () => lib.setDialogs((d) => ({ ...d, search: false }));
  const go = (href: string) => { close(); router.push(href); };
  const viewAll = () => { if (query.trim()) { saveRecent(query.trim()); go(`/dashboard/search?q=${encodeURIComponent(query.trim())}`); } };

  return (
    <>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search title, URL, tags, notes, folders…" aria-label="Search bookmarks" />
      <CommandList>
        {!debounced ? (
          <>
            {recent.length > 0 && (
              <CommandGroup heading="Recent searches">
                {recent.map((r) => <CommandItem key={r} value={`recent-${r}`} onSelect={() => setQuery(r)}><History className="text-muted-foreground" />{r}</CommandItem>)}
              </CommandGroup>
            )}
            <CommandGroup heading="Actions">
              <CommandItem value="add" onSelect={() => { close(); lib.openAddBookmark(); }}><Plus />Add bookmark</CommandItem>
              <CommandItem value="folder" onSelect={() => { close(); lib.openFolderDialog({ mode: "create" }); }}><FolderPlus />New folder</CommandItem>
              <CommandItem value="import" onSelect={() => go("/dashboard/import")}><Import />Import bookmarks</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Go to">
              <CommandItem value="favorites" onSelect={() => go("/dashboard/favorites")}><Star />Favorites</CommandItem>
              <CommandItem value="recent" onSelect={() => go("/dashboard/recent")}><Clock />Recent</CommandItem>
              <CommandItem value="tags" onSelect={() => go("/dashboard/tags")}><Tags />Tags</CommandItem>
            </CommandGroup>
          </>
        ) : loading && !results ? (
          <div className="space-y-2 p-2" aria-busy="true" aria-label="Searching">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : results && results.items.length === 0 ? (
          <CommandEmpty>No bookmarks found. Try another keyword.</CommandEmpty>
        ) : (
          results && (
            <CommandGroup heading={`Bookmarks · ${results.total.toLocaleString()} found`}>
              {results.items.map((b) => (
                <CommandItem key={b.id} value={b.id} onSelect={() => { saveRecent(debounced); close(); lib.openBookmark(b); }}>
                  <Favicon src={b.faviconUrl} domain={b.domain} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium"><Highlight text={b.title} query={debounced} /></span>
                    <span className="block truncate text-xs text-muted-foreground"><Highlight text={b.domain} query={debounced} />{b.folderPath ? ` · ${b.folderPath}` : ""}</span>
                  </span>
                  <CornerDownLeft className="text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
                </CommandItem>
              ))}
              <CommandItem value="__all" onSelect={viewAll} className="text-muted-foreground">View all results for “{debounced}”</CommandItem>
            </CommandGroup>
          )
        )}
      </CommandList>
      <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span><kbd className="font-mono">↑↓</kbd> navigate</span><span><kbd className="font-mono">↵</kbd> open link</span><span><kbd className="font-mono">esc</kbd> close</span>
      </div>
    </>
  );
}
