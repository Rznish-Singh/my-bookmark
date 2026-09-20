"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FolderSelect } from "@/components/bookmarks/form-parts";
import { useLibrary } from "@/components/layout/library-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BookmarkDTO } from "@/lib/types";

export function MoveBookmarkDialog() {
  const { dialogs, setDialogs } = useLibrary();
  const b = dialogs.move;
  return (
    <Dialog open={!!b} onOpenChange={(o) => !o && setDialogs((d) => ({ ...d, move: null }))}>
      <DialogContent className="max-w-sm">{b && <MoveForm key={b.id} b={b} />}</DialogContent>
    </Dialog>
  );
}

function MoveForm({ b }: { b: BookmarkDTO }) {
  const { moveBookmark, folders, setDialogs } = useLibrary();
  const [folderId, setFolderId] = useState<string | null>(b.folderId);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await moveBookmark(b, folderId, folders.find((f) => f.id === folderId)?.name);
        setBusy(false);
        setDialogs((d) => ({ ...d, move: null }));
      }}
    >
      <DialogHeader>
        <DialogTitle>Move bookmark</DialogTitle>
        <DialogDescription className="line-clamp-2">{b.title}</DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="mv-folder">Destination folder</Label>
        <FolderSelect id="mv-folder" value={folderId} onChange={setFolderId} autoFocus />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setDialogs((d) => ({ ...d, move: null }))}>Cancel</Button>
        <Button type="submit" disabled={busy || folderId === b.folderId}>{busy && <Loader2 className="animate-spin" />} Move</Button>
      </DialogFooter>
    </form>
  );
}
