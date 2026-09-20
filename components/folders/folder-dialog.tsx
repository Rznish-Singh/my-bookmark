"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FolderSelect } from "@/components/bookmarks/form-parts";
import { useLibrary, type DialogState } from "@/components/layout/library-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/client/api";
import { descendantIds } from "@/lib/services/folder-path";

export function FolderDialog() {
  const { dialogs, setDialogs } = useLibrary();
  const s = dialogs.folder;
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && setDialogs((d) => ({ ...d, folder: null }))}>
      <DialogContent className="max-w-sm">{s && <FolderForm key={`${s.mode}-${s.folder?.id ?? s.parentId ?? "root"}`} s={s} />}</DialogContent>
    </Dialog>
  );
}

function FolderForm({ s }: { s: NonNullable<DialogState["folder"]> }) {
  const { refresh, folders, setDialogs } = useLibrary();
  const [name, setName] = useState(s.mode === "rename" ? (s.folder?.name ?? "") : "");
  const [parentId, setParentId] = useState<string | null>(s.mode === "move" ? (s.folder?.parentId ?? null) : (s.parentId ?? null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => setDialogs((d) => ({ ...d, folder: null }));

  const exclude = new Set<string>(s.folder ? [s.folder.id, ...descendantIds(folders, s.folder.id)] : []);
  const title = s.mode === "create" ? (s.parentId ? "New subfolder" : "New folder") : s.mode === "rename" ? "Rename folder" : "Move folder";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (s.mode === "create") {
        await api("/api/folders", { method: "POST", body: { name, parentId } });
        toast.success("Folder created");
      } else if (s.mode === "rename" && s.folder) {
        await api(`/api/folders/${s.folder.id}`, { method: "PATCH", body: { name } });
        toast.success("Folder renamed");
      } else if (s.folder) {
        await api(`/api/folders/${s.folder.id}`, { method: "PATCH", body: { parentId } });
        toast.success("Folder moved");
      }
      refresh();
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{s.mode === "move" ? `Choose where “${s.folder?.name}” should live.` : "Folders can be nested as deep as you like."}</DialogDescription>
      </DialogHeader>
      {s.mode !== "move" && (
        <div className="space-y-1.5">
          <Label htmlFor="fd-name">Name</Label>
          <Input id="fd-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Reading list" aria-invalid={!!error} />
        </div>
      )}
      {(s.mode === "move" || s.mode === "create") && (
        <div className="space-y-1.5">
          <Label htmlFor="fd-parent">{s.mode === "create" ? "Inside" : "New location"}</Label>
          <FolderSelect id="fd-parent" value={parentId} onChange={setParentId} exclude={exclude} rootLabel="Top level" />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
        <Button type="submit" disabled={busy || (s.mode !== "move" && !name.trim())}>{busy && <Loader2 className="animate-spin" />}{s.mode === "create" ? "Create folder" : s.mode === "rename" ? "Rename" : "Move folder"}</Button>
      </DialogFooter>
    </form>
  );
}
