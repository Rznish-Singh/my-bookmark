"use client";
import { Bookmark, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibrary } from "@/components/layout/library-provider";
import { cn } from "@/lib/utils/cn";

export function MobileNav() {
  const lib = useLibrary();
  const pathname = usePathname();
  const base = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground outline-none focus-visible:bg-muted [&_svg]:size-5";
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <Link href="/dashboard" className={cn(base, pathname === "/dashboard" && "text-primary")}><Bookmark />Library</Link>
      <button type="button" onClick={lib.openSearch} className={base}><Search />Search</button>
      <Link href="/dashboard/favorites" className={cn(base, pathname.startsWith("/dashboard/favorites") && "text-primary")}><Star />Favorites</Link>
      <button type="button" onClick={() => lib.openAddBookmark()} className={cn(base, "text-primary")}><Plus />Add</button>
    </nav>
  );
}
