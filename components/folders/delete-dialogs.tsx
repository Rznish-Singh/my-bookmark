"use client";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLibrary } from "@/components/layout/library-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/client/api";
import { plural } from "@/lib/client/format";

export function DeleteBookmarkDialog() {
  const { dialogs, setDialogs, refresh } = useLibrary();
  const b = dialogs.deleteBookmark;
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={!!b} onOpenChange={(o) => !o && setDialogs((d) => ({ ...d, deleteBookmark: null }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this bookmark?</AlertDialogTitle>
          <AlertDialogDescription>“{b?.title}” will be permanently removed from your library. This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              if (!b) return;
              setBusy(true);
              try {
                await api(`/api/bookmarks/${b.id}`, { method: "DELETE" });
                toast.success("Bookmark deleted");
                setDialogs((d) => ({ ...d, deleteBookmark: null, detail: d.detail?.id === b.id ? null : d.detail }));
                refresh();
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />} Delete bookmark
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteFolderDialog() {
  const { dialogs, setDialogs, refresh } = useLibrary();
  const router = useRouter();
  const pathname = usePathname();
  const f = dialogs.deleteFolder;
  const [loaded, setLoaded] = useState<{ id: string; bookmarkCount: number; subfolderCount: number } | null>(null);
  const impact = f && loaded?.id === f.id ? loaded : null;
  const [busy, setBusy] = useState<"delete_all" | "move_to_parent" | null>(null);

  useEffect(() => {
    if (!f) return;
    let live = true;
    api<{ bookmarkCount: number; subfolderCount: number }>(`/api/folders/${f.id}`)
      .then((r) => live && setLoaded({ id: f.id, ...r }))
      .catch((e) => { toast.error(errorMessage(e)); setDialogs((d) => ({ ...d, deleteFolder: null })); });
    return () => { live = false; };
  }, [f, setDialogs]);

  const run = async (strategy: "delete_all" | "move_to_parent") => {
    if (!f) return;
    setBusy(strategy);
    try {
      const res = await api<{ deletedBookmarks: number; movedBookmarks: number }>(`/api/folders/${f.id}`, { method: "DELETE", body: { strategy } });
      toast.success(strategy === "delete_all" ? `Folder deleted${res.deletedBookmarks ? ` with ${plural(res.deletedBookmarks, "bookmark")}` : ""}` : `Folder deleted. ${plural(res.movedBookmarks, "bookmark")} moved up`);
      setDialogs((d) => ({ ...d, deleteFolder: null }));
      if (pathname.includes(f.id)) router.push("/dashboard");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const empty = impact && impact.bookmarkCount === 0 && impact.subfolderCount === 0;

  return (
    <AlertDialog open={!!f} onOpenChange={(o) => !o && setDialogs((d) => ({ ...d, deleteFolder: null }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {!impact ? (
                <div className="space-y-2"><Skeleton className="h-4 w-56" /><Skeleton className="h-4 w-40" /></div>
              ) : empty ? (
                <>“{f?.name}” is empty and will be removed.</>
              ) : (
                <>
                  <p>“{f?.name}” contains:</p>
                  <ul className="mt-2 list-inside list-disc text-foreground">
                    <li>{plural(impact.bookmarkCount, "bookmark")}</li>
                    <li>{plural(impact.subfolderCount, "subfolder")}</li>
                  </ul>
                  <p className="mt-2">Choose what happens to them. Nothing is deleted until you pick an option.</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {impact && !empty && (
            <Button variant="outline" disabled={!!busy} onClick={() => run("move_to_parent")}>
              {busy === "move_to_parent" && <Loader2 className="animate-spin" />} Move bookmarks to parent
            </Button>
          )}
          {impact && (
            <Button variant="destructive" disabled={!!busy} onClick={() => run("delete_all")}>
              {busy === "delete_all" && <Loader2 className="animate-spin" />} {empty ? "Delete folder" : "Delete folder and bookmarks"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
