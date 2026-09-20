"use client";
import { Menu, PanelLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookmarkDetail } from "@/components/bookmarks/bookmark-detail";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { MoveBookmarkDialog } from "@/components/bookmarks/move-dialog";
import { DeleteBookmarkDialog, DeleteFolderDialog } from "@/components/folders/delete-dialogs";
import { FolderDialog } from "@/components/folders/folder-dialog";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LibraryProvider, useLibrary } from "@/components/layout/library-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/search/global-search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useStoredFlag } from "@/lib/client/use-stored-flag";
import type { FolderNode, TagWithCount } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface Props {
  user: { name: string; email: string };
  tree: FolderNode[];
  tags: TagWithCount[];
  totalCount: number;
  children: React.ReactNode;
}

export function AppShell({ children, ...data }: Props) {
  return (
    <LibraryProvider {...data}>
      <Shell>{children}</Shell>
    </LibraryProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const lib = useLibrary();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useStoredFlag("bv:sidebar-collapsed");
  const toggleSidebar = () => setCollapsed(!collapsed);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "k" && !e.shiftKey) { e.preventDefault(); lib.setDialogs((d) => ({ ...d, search: !d.search })); }
      else if (k === "b" && !e.shiftKey) { e.preventDefault(); lib.openAddBookmark(); }
      else if (k === "f" && e.shiftKey) { e.preventDefault(); router.push("/dashboard/favorites"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lib, router]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>

      <aside className={cn("hidden w-64 shrink-0 border-r border-sidebar-border lg:block", collapsed && "lg:hidden")}>
        <AppSidebar />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Browse your library and folders</SheetDescription>
          <AppSidebar onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu /></Button>
          <Button variant="ghost" size="icon-sm" className="hidden lg:inline-flex" aria-label={collapsed ? "Show sidebar" : "Hide sidebar"} aria-pressed={!collapsed} onClick={toggleSidebar}><PanelLeft /></Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Search bookmarks" onClick={lib.openSearch}><Search /></Button>
        </div>
        <main id="main" tabIndex={-1} className="scroll-thin min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">{children}</div>
        </main>
      </div>

      <MobileNav />
      <BookmarkDialog />
      <BookmarkDetail />
      <MoveBookmarkDialog />
      <FolderDialog />
      <DeleteBookmarkDialog />
      <DeleteFolderDialog />
      <GlobalSearch />
    </div>
  );
}
