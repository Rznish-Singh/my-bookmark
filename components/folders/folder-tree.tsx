"use client";
import { ChevronRight, Folder, FolderOpen, FolderPlus, FolderInput, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DRAG_TYPE } from "@/components/bookmarks/bookmark-card";
import { useLibrary } from "@/components/layout/library-provider";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { wouldCreateCycle } from "@/lib/services/folder-path";
import type { FolderNode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const FOLDER_DRAG = "application/x-bookmark-vault-folder";

function ancestorsOf(tree: FolderNode[], id: string, trail: string[] = []): string[] | null {
  for (const n of tree) {
    if (n.id === id) return trail;
    const found = ancestorsOf(n.children, id, [...trail, n.id]);
    if (found) return found;
  }
  return null;
}

export function FolderTree({ onNavigate }: { onNavigate?: () => void }) {
  const { tree } = useLibrary();
  const pathname = usePathname();
  const activeId = pathname.startsWith("/dashboard/folder/") ? pathname.split("/")[3] : null;
  const [manual, setManual] = useState<Set<string>>(new Set());
  // The active folder's ancestors are always open so the current location is visible.
  const expanded = useMemo(() => new Set([...manual, ...(activeId ? (ancestorsOf(tree, activeId) ?? []) : [])]), [manual, activeId, tree]);

  const toggle = (id: string) =>
    setManual((prev) => {
      const next = new Set(prev);
      if (expanded.has(id)) next.delete(id); else next.add(id);
      // An ancestor of the active folder stays open; otherwise the click would appear to do nothing.
      return next;
    });

  if (tree.length === 0) {
    return <p className="px-2 py-2 text-xs leading-relaxed text-muted-foreground">No folders yet. Create one, or import your browser bookmarks.</p>;
  }
  return (
    <ul role="tree" aria-label="Folders" className="space-y-px">
      {tree.map((n) => <FolderItem key={n.id} node={n} depth={0} expanded={expanded} toggle={toggle} activeId={activeId} onNavigate={onNavigate} />)}
    </ul>
  );
}

function FolderItem({ node, depth, expanded, toggle, activeId, onNavigate }: {
  node: FolderNode; depth: number; expanded: Set<string>; toggle: (id: string) => void; activeId: string | null; onNavigate?: () => void;
}) {
  const lib = useLibrary();
  const [dropOver, setDropOver] = useState(false);
  const isOpen = expanded.has(node.id);
  const active = activeId === node.id;
  const hasChildren = node.children.length > 0;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropOver(false);
    const bookmarkId = e.dataTransfer.getData(DRAG_TYPE);
    const folderId = e.dataTransfer.getData(FOLDER_DRAG);
    if (bookmarkId) void lib.moveBookmark({ id: bookmarkId }, node.id, node.name);
    else if (folderId && folderId !== node.id) void lib.moveFolder(folderId, node.id);
  };
  const onDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes(DRAG_TYPE)) { e.preventDefault(); setDropOver(true); return; }
    if (types.includes(FOLDER_DRAG)) {
      // We can't read data during dragover; cycles are rejected by the server and by the check on drop.
      e.preventDefault();
      setDropOver(true);
    }
  };

  const flat = lib.folders;
  const guardedDrop = (e: React.DragEvent) => {
    const folderId = e.dataTransfer.getData(FOLDER_DRAG);
    if (folderId && wouldCreateCycle(flat, folderId, node.id)) {
      e.preventDefault();
      setDropOver(false);
      toast.error("A folder can't be moved into itself or one of its subfolders.");
      return;
    }
    onDrop(e);
  };

  const self = { id: node.id, parentId: node.parentId, name: node.name, position: node.position, bookmarkCount: node.bookmarkCount };

  const menuItems = (Item: typeof ContextMenuItem | typeof DropdownMenuItem, Sep: typeof ContextMenuSeparator | typeof DropdownMenuSeparator) => (
    <>
      <Item onSelect={() => lib.openAddBookmark(node.id)}><Plus /> Add bookmark here</Item>
      <Item onSelect={() => lib.openFolderDialog({ mode: "create", parentId: node.id })}><FolderPlus /> New child folder</Item>
      <Sep />
      <Item onSelect={() => lib.openFolderDialog({ mode: "rename", folder: self })}><Pencil /> Rename</Item>
      <Item onSelect={() => lib.openFolderDialog({ mode: "move", folder: self })}><FolderInput /> Move…</Item>
      <Sep />
      <Item variant="destructive" onSelect={() => lib.requestDeleteFolder(self)}><Trash2 /> Delete…</Item>
    </>
  );

  return (
    <li role="none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="treeitem"
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-selected={active}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData(FOLDER_DRAG, node.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={onDragOver}
            onDragLeave={() => setDropOver(false)}
            onDrop={guardedDrop}
            className={cn(
              "group/row flex h-8 items-center rounded-md pr-1 text-[13px] transition-colors",
              active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80 hover:bg-muted",
              dropOver && "bg-accent ring-1 ring-primary",
            )}
            style={{ paddingLeft: 4 + depth * 12 }}
          >
            <button
              type="button"
              tabIndex={hasChildren ? 0 : -1}
              aria-label={hasChildren ? `${isOpen ? "Collapse" : "Expand"} ${node.name}` : undefined}
              onClick={() => hasChildren && toggle(node.id)}
              className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10", !hasChildren && "pointer-events-none opacity-0")}
            >
              <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
            </button>
            <Link href={`/dashboard/folder/${node.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {isOpen && hasChildren ? <FolderOpen className="size-4 shrink-0 text-muted-foreground" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{node.name}</span>
            </Link>
            <span className="ml-1 text-[11px] tabular-nums text-muted-foreground group-hover/row:hidden group-focus-within/row:hidden">{node.totalCount > 0 ? node.totalCount.toLocaleString() : ""}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`Actions for folder ${node.name}`} className="hidden size-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 group-hover/row:flex group-focus-within/row:flex data-[state=open]:flex">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">{menuItems(DropdownMenuItem, DropdownMenuSeparator)}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>{menuItems(ContextMenuItem, ContextMenuSeparator)}</ContextMenuContent>
      </ContextMenu>
      {hasChildren && isOpen && (
        <ul role="group" className="space-y-px">
          {node.children.map((c) => <FolderItem key={c.id} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} activeId={activeId} onNavigate={onNavigate} />)}
        </ul>
      )}
    </li>
  );
}
