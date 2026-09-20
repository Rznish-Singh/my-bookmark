"use client";
import { ExternalLink, Folder, FolderInput, Link2, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Favicon } from "@/components/bookmarks/favicon";
import { useLibrary } from "@/components/layout/library-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import type { BookmarkDTO } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function BookmarkDetail() {
  const lib = useLibrary();
  const { dialogs, setDialogs } = lib;
  const [b, setB] = useState<BookmarkDTO | null>(dialogs.detail);
  const [imgOk, setImgOk] = useState(true);
  const [seen, setSeen] = useState(dialogs.detail);
  if (dialogs.detail && dialogs.detail !== seen) { setSeen(dialogs.detail); setB(dialogs.detail); setImgOk(true); }
  const close = () => setDialogs((d) => ({ ...d, detail: null }));

  const toggleFav = async () => {
    if (!b) return;
    try {
      setB(await lib.setFavorite(b.id, !b.isFavorite));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Sheet open={!!dialogs.detail} onOpenChange={(o) => !o && close()}>
      <SheetContent className="max-w-lg">
        {b && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Favicon src={b.faviconUrl} domain={b.domain} />{b.domain}</div>
              <SheetTitle className="text-lg">{b.title}</SheetTitle>
              <SheetDescription className="break-all text-xs">{b.url}</SheetDescription>
            </SheetHeader>
            <div className="scroll-thin flex-1 space-y-5 overflow-y-auto p-4">
              {b.thumbnailUrl && imgOk && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host
                <img src={b.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} className="max-h-52 w-full rounded-lg border bg-muted object-cover" />
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => lib.openBookmark(b)}><ExternalLink /> Open</Button>
                <Button size="sm" variant="outline" onClick={() => lib.openEditBookmark(b)}><Pencil /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => lib.openMove(b)}><FolderInput /> Move</Button>
                <Button size="sm" variant="outline" aria-pressed={b.isFavorite} onClick={toggleFav}>
                  <Star className={cn(b.isFavorite && "fill-star text-star")} /> {b.isFavorite ? "Favorited" : "Favorite"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(b.url).then(() => toast.success("URL copied"), () => toast.error("Couldn't copy"))}><Link2 /> Copy URL</Button>
              </div>
              {b.description && <Section title="Description"><p className="text-sm leading-relaxed">{b.description}</p></Section>}
              <Section title="Folder">
                {b.folderPath ? (
                  <Link href={`/dashboard/folder/${b.folderId}`} onClick={close} className="inline-flex items-center gap-1.5 text-sm hover:underline"><Folder className="size-4 text-muted-foreground" />{b.folderPath}</Link>
                ) : <span className="text-sm text-muted-foreground">Library root</span>}
              </Section>
              <Section title="Tags">
                {b.tags.length ? (
                  <div className="flex flex-wrap gap-1.5">{b.tags.map((t) => <Link key={t.id} href={`/dashboard/search?tag=${encodeURIComponent(t.name)}`} onClick={close}><Badge variant="default">#{t.name}</Badge></Link>)}</div>
                ) : <span className="text-sm text-muted-foreground">No tags</span>}
              </Section>
              <Section title="Notes">{b.notes ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.notes}</p> : <span className="text-sm text-muted-foreground">No notes</span>}</Section>
              <Separator />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Added</dt><dd>{formatDate(b.createdAt)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Updated</dt><dd>{formatDate(b.updatedAt)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Visits</dt><dd>{b.visitCount}</dd></div>
              </dl>
            </div>
            <div className="border-t p-3">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => lib.requestDeleteBookmark(b)}><Trash2 /> Delete bookmark</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-1.5"><h3 className="text-xs font-medium text-muted-foreground">{title}</h3>{children}</section>;
}
