"use client";
import { Import, Plus } from "lucide-react";
import Link from "next/link";
import { useLibrary } from "@/components/layout/library-provider";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

export function PageHeader({ crumbs, title, subtitle, count, actions = "library", folderId }: {
  crumbs: Crumb[]; title: string; subtitle?: React.ReactNode; count?: string; actions?: "library" | "none"; folderId?: string | null;
}) {
  const { openAddBookmark } = useLibrary();
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 space-y-1.5">
        <Breadcrumb items={crumbs} />
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}{count && <span className="ml-2 tabular-nums">{subtitle ? "· " : ""}{count}</span>}</p>
      </div>
      {actions === "library" && (
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/import"><Import /> Import</Link></Button>
          <Button onClick={() => openAddBookmark(folderId ?? null)}><Plus /> Add Bookmark</Button>
        </div>
      )}
    </header>
  );
}
