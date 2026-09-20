"use client";
import { Hash, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { useLibrary } from "@/components/layout/library-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/client/api";
import { plural } from "@/lib/client/format";
import type { TagWithCount } from "@/lib/types";

export function TagsManager() {
  const { tags, refresh } = useLibrary();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<TagWithCount | null>(null);
  const [deleting, setDeleting] = useState<TagWithCount | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api("/api/tags", { method: "POST", body: { name: name.trim().replace(/^#/, "") } });
      toast.success("Tag created");
      setName("");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const max = Math.max(1, ...tags.map((t) => t.count));

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={create} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" aria-label="New tag name" maxLength={40} />
        <Button type="submit" disabled={busy || !name.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Create tag</Button>
      </form>

      {tags.length === 0 ? (
        <EmptyState icon={<Hash />} title="No tags yet." description="Add tags while saving or editing a bookmark to see them here." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {tags.map((t) => (
            <li key={t.id} className="group relative flex items-center gap-3 px-4 py-2.5">
              <Hash className="size-4 text-muted-foreground" />
              <Link href={`/dashboard/search?tag=${encodeURIComponent(t.name)}`} className="min-w-0 flex-1 truncate text-sm font-medium after:absolute after:inset-0 hover:underline">{t.name}</Link>
              <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block" aria-hidden><div className="h-full bg-primary/60" style={{ width: `${(t.count / max) * 100}%` }} /></div>
              <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{t.count}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs" className="relative z-10" aria-label={`Actions for tag ${t.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setRenaming(t)}><Pencil /> Rename</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(t)}><Trash2 /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Attach or detach tags from a bookmark using Edit. Deleting a tag only removes the label, never the bookmarks.</p>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="max-w-sm">{renaming && <RenameForm key={renaming.id} tag={renaming} onDone={() => { setRenaming(null); refresh(); }} />}</DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from {plural(deleting?.count ?? 0, "bookmark")}. The bookmarks themselves stay in your library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={async () => {
              if (!deleting) return;
              try { await api(`/api/tags/${deleting.id}`, { method: "DELETE" }); toast.success("Tag deleted"); refresh(); } catch (e) { toast.error(errorMessage(e)); }
            }}>Delete tag</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameForm({ tag, onDone }: { tag: TagWithCount; onDone: () => void }) {
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true); setError(null);
      try { await api(`/api/tags/${tag.id}`, { method: "PATCH", body: { name } }); toast.success("Tag renamed"); onDone(); }
      catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
    }}>
      <DialogHeader><DialogTitle>Rename tag</DialogTitle><DialogDescription>Applies to all {plural(tag.count, "bookmark")} using it.</DialogDescription></DialogHeader>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Tag name" aria-invalid={!!error} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" disabled={busy || !name.trim()}>Rename</Button></DialogFooter>
    </form>
  );
}
