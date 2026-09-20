import { Skeleton } from "@/components/ui/skeleton";

export function BookmarkGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading bookmarks">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2"><Skeleton className="size-5 rounded" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-4 w-4/5" />
          <div className="space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
          <div className="flex gap-1.5"><Skeleton className="h-5 w-14" /><Skeleton className="h-5 w-12" /></div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div>
      <Skeleton className="h-9 w-full" />
      <BookmarkGridSkeleton />
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>;
}
