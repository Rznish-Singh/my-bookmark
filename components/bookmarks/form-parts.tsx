"use client";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { useLibrary } from "@/components/layout/library-provider";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/input";
import { buildPathMap } from "@/lib/services/folder-path";
import { cn } from "@/lib/utils/cn";
import type { FolderDTO } from "@/lib/types";

/** Flatten folders depth-first with their full path, e.g. "Development / Next.js". */
export function folderOptions(folders: FolderDTO[], exclude: Set<string> = new Set()) {
  const paths = buildPathMap(folders);
  return folders
    .filter((f) => !exclude.has(f.id))
    .map((f) => ({ id: f.id, path: paths.get(f.id) ?? f.name, depth: (paths.get(f.id) ?? "").split(" / ").length - 1 }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function FolderSelect({ value, onChange, exclude, rootLabel = "No folder (Library root)", id, ...rest }: {
  value: string | null; onChange: (v: string | null) => void; exclude?: Set<string>; rootLabel?: string; id?: string;
} & Omit<React.ComponentProps<"select">, "value" | "onChange">) {
  const { folders } = useLibrary();
  const opts = folderOptions(folders, exclude);
  return (
    <NativeSelect id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} {...rest}>
      <option value="">{rootLabel}</option>
      {opts.map((o) => <option key={o.id} value={o.id}>{o.path}</option>)}
    </NativeSelect>
  );
}

export function TagInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id?: string }) {
  const { tags } = useLibrary();
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const name = raw.trim().replace(/^#/, "").replace(/,+$/, "").trim();
    if (!name || value.some((v) => v.toLowerCase() === name.toLowerCase()) || value.length >= 20) return;
    onChange([...value, name.slice(0, 40)]);
  };

  return (
    <div className={cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25")}>
      {value.map((t) => (
        <Badge key={t} variant="default" className="gap-1 pr-1">
          #{t}
          <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 hover:bg-foreground/10"><X /></button>
        </Badge>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        placeholder={value.length ? "" : "Add a tag and press Enter"}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) { add(e.target.value); setDraft(""); } else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); setDraft(""); }
          else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => { if (draft.trim()) { add(draft); setDraft(""); } }}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      <datalist id={listId}>{tags.filter((t) => !value.includes(t.name)).slice(0, 50).map((t) => <option key={t.id} value={t.name} />)}</datalist>
    </div>
  );
}
