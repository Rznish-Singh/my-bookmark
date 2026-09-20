"use client";
import { Bookmark, Clock, FolderPlus, LogOut, Search, Settings, Star, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DRAG_TYPE } from "@/components/bookmarks/bookmark-card";
import { FolderTree } from "@/components/folders/folder-tree";
import { useLibrary } from "@/components/layout/library-provider";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "All Bookmarks", icon: Bookmark, match: (p: string) => p === "/dashboard" || p === "/dashboard/all", count: true },
  { href: "/dashboard/favorites", label: "Favorites", icon: Star, match: (p: string) => p.startsWith("/dashboard/favorites") },
  { href: "/dashboard/recent", label: "Recent", icon: Clock, match: (p: string) => p.startsWith("/dashboard/recent") },
  { href: "/dashboard/tags", label: "Tags", icon: Tags, match: (p: string) => p.startsWith("/dashboard/tags") },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const lib = useLibrary();
  const pathname = usePathname();
  const router = useRouter();
  const [rootDrop, setRootDrop] = useState(false);
  const initials = lib.user.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "U";
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

  const signOut = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><Bookmark className="size-4" /></span>
        <span className="text-[15px] font-semibold tracking-tight">Bookmark Vault</span>
      </div>

      <div className="px-3 pb-2 pt-1">
        <button
          type="button"
          onClick={() => { onNavigate?.(); lib.openSearch(); }}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search bookmarks</span>
          <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">{isMac ? "⌘" : "Ctrl"} K</kbd>
        </button>
      </div>

      <nav aria-label="Library" className="space-y-px px-3 py-1">
        {NAV.map(({ href, label, icon: Icon, match, count }) => {
          const active = match(pathname);
          const isRoot = href === "/dashboard";
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              onDragOver={isRoot ? (e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setRootDrop(true); } } : undefined}
              onDragLeave={isRoot ? () => setRootDrop(false) : undefined}
              onDrop={isRoot ? (e) => { e.preventDefault(); setRootDrop(false); const id = e.dataTransfer.getData(DRAG_TYPE); if (id) void lib.moveBookmark({ id }, null); } : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80 hover:bg-muted",
                isRoot && rootDrop && "bg-accent ring-1 ring-primary",
              )}
            >
              <Icon className={cn("size-4", label === "Favorites" && active ? "fill-star text-star" : "text-muted-foreground")} />
              <span className="flex-1">{label}</span>
              {count && <span className="text-[11px] tabular-nums text-muted-foreground">{lib.totalCount.toLocaleString()}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 flex items-center justify-between px-5 pb-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Folders</h2>
        <Button variant="ghost" size="icon-xs" aria-label="New folder" onClick={() => { onNavigate?.(); lib.openFolderDialog({ mode: "create" }); }}>
          <FolderPlus />
        </Button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-2"><FolderTree onNavigate={onNavigate} /></div>

      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" size="sm" className="mb-1 w-full justify-start gap-2.5 px-2 text-[13px] font-normal text-foreground/80" onClick={() => { onNavigate?.(); lib.openFolderDialog({ mode: "create" }); }}>
          <FolderPlus className="text-muted-foreground" /> New Folder
        </Button>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">{initials}</span>
                <span className="min-w-0"><span className="block truncate text-[13px] font-medium leading-tight">{lib.user.name}</span><span className="block truncate text-[11px] text-muted-foreground">{lib.user.email}</span></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel>{lib.user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { onNavigate?.(); router.push("/dashboard/settings"); }}><Settings /> Settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={signOut}><LogOut /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Settings"><Link href="/dashboard/settings" onClick={onNavigate}><Settings /></Link></Button>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
