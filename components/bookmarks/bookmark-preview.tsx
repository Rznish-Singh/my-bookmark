"use client";
import { Favicon } from "@/components/bookmarks/favicon";
import { Skeleton } from "@/components/ui/skeleton";

export interface PreviewData { title?: string | null; description?: string | null; favicon?: string | null; image?: string | null; domain: string }

export function BookmarkPreview({ data, loading }: { data: PreviewData | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/40 p-3" aria-busy="true" aria-label="Loading preview">
        <Skeleton className="h-24 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host
        <img src={data.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-32 w-full bg-muted object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
      )}
      <div className="space-y-1 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Favicon src={data.favicon} domain={data.domain} />{data.domain}</div>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{data.title || data.domain}</p>
        {data.description && <p className="line-clamp-2 text-[13px] text-muted-foreground">{data.description}</p>}
      </div>
    </div>
  );
}
