"use client";
import { ChevronRight, Folder } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { plural } from "@/lib/client/format";
import type { FolderTreeNode } from "@/lib/parsers/bookmark-html-parser";
import type { ImportPreview as Preview } from "@/lib/services/import-service";
import { cn } from "@/lib/utils/cn";

const MAX_NODES = 400;

export interface ImportChoices { skipDuplicates: boolean; mergeFolders: boolean }

export function ImportPreview({ preview, fileName, onConfirm, onCancel }: { preview: Preview; fileName: string; onConfirm: (c: ImportChoices) => void; onCancel: () => void }) {
  const [choices, setChoices] = useState<ImportChoices>({ skipDuplicates: true, mergeFolders: true });
  const { stats } = preview;
  const stat = (label: string, value: number) => (
    <div className="rounded-lg border bg-card p-3"><div className="text-2xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</div><div className="text-xs text-muted-foreground">{label}</div></div>
  );
  const visible = useMemo(() => pickVisible(preview.tree), [preview.tree]);
  const toImport = stats.bookmarkCount - (choices.skipDuplicates ? stats.duplicateCount : 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Import Preview</h2>
        <p className="text-sm text-muted-foreground">Found in <span className="font-medium text-foreground">{fileName}</span>. Nothing is imported until you confirm.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(stats.bookmarkCount === 1 ? "bookmark" : "bookmarks", stats.bookmarkCount)}
        {stat(stats.folderCount === 1 ? "folder" : "folders", stats.folderCount)}
        {stat("nested folders", stats.nestedFolderCount)}
        {stat("possible duplicates", stats.duplicateCount)}
      </div>
      {stats.skippedCount > 0 && <p className="text-sm text-muted-foreground">{plural(stats.skippedCount, "link")} (such as bookmarklets or browser-internal pages) will be ignored.</p>}
      {stats.duplicateCount > 0 && (
        <Alert variant="warning">
          <div>
            <AlertTitle>{plural(stats.duplicateCount, "possible duplicate")}</AlertTitle>
            <AlertDescription>
              {preview.duplicatesInLibrary > 0 ? `${plural(preview.duplicatesInLibrary, "bookmark")} already in your library, and others repeat inside this file. ` : "These URLs appear more than once in this file. "}
              Duplicates are detected after ignoring tracking parameters and trailing slashes.
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Folder structure</h3>
        <div className="scroll-thin max-h-80 overflow-auto rounded-lg border bg-card p-2">
          {preview.tree.length === 0 ? <p className="p-2 text-sm text-muted-foreground">No folders. Bookmarks will be added at the top level.</p> : <Tree nodes={preview.tree} visible={visible.ids} truncated={visible.truncated} />}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2"><Checkbox id="skipdup" checked={choices.skipDuplicates} onCheckedChange={(v) => setChoices((c) => ({ ...c, skipDuplicates: v === true }))} /><Label htmlFor="skipdup" className="font-normal">Skip duplicate bookmarks</Label></div>
        <div className="flex items-center gap-2"><Checkbox id="merge" checked={choices.mergeFolders} onCheckedChange={(v) => setChoices((c) => ({ ...c, mergeFolders: v === true }))} /><Label htmlFor="merge" className="font-normal">Merge into existing folders with the same name</Label></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onConfirm(choices)} disabled={toImport <= 0 && stats.folderCount === 0}>Import Everything{toImport > 0 ? ` (${toImport.toLocaleString()})` : ""}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function pickVisible(tree: FolderTreeNode[]) {
  const ids = new Set<string>();
  let truncated = false;
  const walk = (nodes: FolderTreeNode[]) => {
    for (const n of nodes) {
      if (ids.size >= MAX_NODES) { truncated = true; return; }
      ids.add(n.id);
      walk(n.children);
    }
  };
  walk(tree);
  return { ids, truncated };
}

function Tree({ nodes, visible, truncated, depth = 0 }: { nodes: FolderTreeNode[]; visible: Set<string>; truncated: boolean; depth?: number }) {
  return (
    <ul className={cn(depth > 0 && "ml-3 border-l pl-2")}>
      {nodes.filter((n) => visible.has(n.id)).map((n) => (
        <li key={n.id}>
          <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-sm"><Folder className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{n.name}</span><span className="text-xs tabular-nums text-muted-foreground">{n.bookmarkCount}</span></div>
          {n.children.length > 0 && <Tree nodes={n.children} visible={visible} truncated={false} depth={depth + 1} />}
        </li>
      ))}
      {depth === 0 && truncated && <li className="flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground"><ChevronRight className="size-3" /> Preview truncated. Everything will still be imported.</li>}
    </ul>
  );
}
