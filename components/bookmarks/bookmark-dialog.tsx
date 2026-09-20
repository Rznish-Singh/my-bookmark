"use client";
import { Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderSelect, TagInput } from "@/components/bookmarks/form-parts";
import { BookmarkPreview, type PreviewData } from "@/components/bookmarks/bookmark-preview";
import { useLibrary } from "@/components/layout/library-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, errorMessage } from "@/lib/client/api";
import type { BookmarkDTO, DuplicateInfo } from "@/lib/types";

interface MetaResponse {
  url: string;
  metadata: { title: string | null; description: string | null; favicon: string | null; image: string | null; domain: string };
  duplicate: DuplicateInfo | null;
  fetched: boolean;
}

function looksLikeUrl(v: string) {
  const t = v.trim();
  if (!t || /\s/.test(t)) return false;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function BookmarkDialog() {
  const { dialogs, setDialogs } = useLibrary();
  const state = dialogs.bookmark;
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && setDialogs((d) => ({ ...d, bookmark: null }))}>
      <DialogContent className="max-w-xl">
        {state && <BookmarkForm key={`${state.mode}-${state.bookmark?.id ?? "new"}`} mode={state.mode} bookmark={state.bookmark} defaultFolderId={state.folderId ?? null} onDone={() => setDialogs((d) => ({ ...d, bookmark: null }))} />}
      </DialogContent>
    </Dialog>
  );
}

function BookmarkForm({ mode, bookmark, defaultFolderId, onDone }: { mode: "add" | "edit"; bookmark?: BookmarkDTO; defaultFolderId: string | null; onDone: () => void }) {
  const { refresh, folders } = useLibrary();
  const [url, setUrl] = useState(bookmark?.url ?? "");
  const [title, setTitle] = useState(bookmark?.title ?? "");
  const [description, setDescription] = useState(bookmark?.description ?? "");
  const [notes, setNotes] = useState(bookmark?.notes ?? "");
  const [folderId, setFolderId] = useState<string | null>(bookmark ? bookmark.folderId : defaultFolderId);
  const [tags, setTags] = useState<string[]>(bookmark?.tags.map((t) => t.name) ?? []);
  const [isFavorite, setIsFavorite] = useState(bookmark?.isFavorite ?? false);
  const [preview, setPreview] = useState<PreviewData | null>(bookmark ? { title: bookmark.title, description: bookmark.description, favicon: bookmark.faviconUrl, image: bookmark.thumbnailUrl, domain: bookmark.domain } : null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaFailed, setMetaFailed] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touched = useRef({ title: mode === "edit", description: mode === "edit" });
  const reqId = useRef(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const lookup = (value: string) => {
    const id = ++reqId.current;
    setLoadingMeta(true);
    setMetaFailed(false);
    api<MetaResponse>("/api/metadata", { method: "POST", body: { url: value } })
      .then((res) => {
        if (id !== reqId.current) return;
        setPreview({ ...res.metadata });
        setDuplicate(res.duplicate);
        setMetaFailed(!res.fetched);
        if (!touched.current.title && res.metadata.title) setTitle(res.metadata.title);
        if (!touched.current.description && res.metadata.description) setDescription(res.metadata.description);
      })
      .catch((e) => { if (id === reqId.current) { setError(errorMessage(e)); setPreview(null); } })
      .finally(() => { if (id === reqId.current) setLoadingMeta(false); });
  };

  const onUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    if (mode === "edit") return;
    if (timer.current) clearTimeout(timer.current);
    if (!looksLikeUrl(value)) {
      reqId.current++; // drop any in-flight lookup
      setPreview(null); setDuplicate(null); setMetaFailed(false); setLoadingMeta(false);
      return;
    }
    timer.current = setTimeout(() => lookup(value), 600);
  };

  const save = async (force = false) => {
    setError(null);
    if (!url.trim()) return setError("Enter a URL to save.");
    setSaving(true);
    try {
      if (mode === "edit" && bookmark) {
        await api(`/api/bookmarks/${bookmark.id}`, { method: "PATCH", body: { url, title: title || undefined, description: description || null, notes: notes || null, folderId, tags, isFavorite } });
        toast.success("Bookmark updated");
      } else {
        await api("/api/bookmarks", {
          method: "POST",
          body: { url, title: title || undefined, description: description || null, notes: notes || null, folderId, tags, isFavorite, faviconUrl: preview?.favicon ?? null, thumbnailUrl: preview?.image ?? null, force },
        });
        toast.success("Bookmark saved");
      }
      refresh();
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === "conflict" && e.data?.duplicate) setDuplicate(e.data.duplicate as DuplicateInfo);
      else setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const folderName = folders.find((f) => f.id === folderId)?.name;

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(false); }} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit bookmark" : "Add bookmark"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update the details of this link." : "Paste a link. We'll fetch its title, description and image."}</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="bm-url">URL</Label>
        <div className="relative">
          <Input id="bm-url" autoFocus={mode === "add"} inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://example.com" value={url} onChange={(e) => onUrlChange(e.target.value)} aria-invalid={!!error && !url.trim()} />
          {loadingMeta && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Fetching details" />}
        </div>
      </div>

      {duplicate && (
        <Alert variant="warning">
          <TriangleAlert />
          <div className="min-w-0 flex-1">
            <AlertTitle>Possible duplicate</AlertTitle>
            <AlertDescription>
              This URL already exists: <span className="font-medium">{duplicate.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{duplicate.domain}</span>
            </AlertDescription>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="xs" variant="outline" asChild><a href={duplicate.url} target="_blank" rel="noopener noreferrer">Open existing</a></Button>
              {mode === "add" && <Button type="button" size="xs" variant="outline" disabled={saving} onClick={() => save(true)}>Save anyway</Button>}
            </div>
          </div>
        </Alert>
      )}

      {mode === "add" && (loadingMeta || preview) && <BookmarkPreview data={preview} loading={loadingMeta && !preview} />}
      {metaFailed && <p className="-mt-2 text-xs text-muted-foreground">Couldn&apos;t fetch details for this site. You can still save it with your own title.</p>}

      <div className="space-y-1.5">
        <Label htmlFor="bm-title">Title</Label>
        <Input id="bm-title" value={title} onChange={(e) => { touched.current.title = true; setTitle(e.target.value); }} placeholder="Page title" maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bm-desc">Description</Label>
        <Textarea id="bm-desc" rows={2} value={description} onChange={(e) => { touched.current.description = true; setDescription(e.target.value); }} maxLength={2000} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bm-folder">Folder</Label>
          <FolderSelect id="bm-folder" value={folderId} onChange={setFolderId} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bm-tags">Tags</Label>
          <TagInput id="bm-tags" value={tags} onChange={setTags} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bm-notes">Notes</Label>
        <Textarea id="bm-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why did you save this?" maxLength={10000} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="bm-fav" checked={isFavorite} onCheckedChange={(v) => setIsFavorite(v === true)} />
        <Label htmlFor="bm-fav" className="font-normal">Add to favorites</Label>
      </div>

      {error && <Alert variant="destructive"><TriangleAlert /><div>{error}</div></Alert>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {mode === "edit" ? "Save changes" : folderName ? `Save to ${folderName}` : "Save bookmark"}
        </Button>
      </DialogFooter>
    </form>
  );
}
