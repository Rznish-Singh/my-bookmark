"use client";
import { ListFilter, X } from "lucide-react";
import { useLibrary } from "@/components/layout/library-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQueryParams } from "@/lib/client/use-query-params";
import { buildPathMap } from "@/lib/services/folder-path";
import { cn } from "@/lib/utils/cn";

export const RANGE_LABELS: Record<string, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", year: "Last year" };

export function useActiveFilters(hideFolder?: boolean) {
  const { params } = useQueryParams();
  return {
    folderId: hideFolder ? null : params.get("folderId"),
    tags: params.getAll("tag"),
    domain: params.get("domain"),
    favorite: params.get("favorite") === "true",
    range: params.get("range"),
  };
}

export function SearchFilters({ domains, hideFolder }: { domains: { domain: string; count: number }[]; hideFolder?: boolean }) {
  const { folders, tags } = useLibrary();
  const { set } = useQueryParams();
  const active = useActiveFilters(hideFolder);
  const paths = buildPathMap(folders);
  const folderOptions = folders.map((f) => ({ id: f.id, path: paths.get(f.id) ?? f.name })).sort((a, b) => a.path.localeCompare(b.path));
  const count = (active.folderId ? 1 : 0) + active.tags.length + (active.domain ? 1 : 0) + (active.favorite ? 1 : 0) + (active.range ? 1 : 0);

  const toggleTag = (name: string) => {
    const has = active.tags.some((t) => t.toLowerCase() === name.toLowerCase());
    set({ tag: has ? active.tags.filter((t) => t.toLowerCase() !== name.toLowerCase()) : [...active.tags, name] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListFilter /> Filter
          {count > 0 && <span className="ml-0.5 rounded bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] space-y-4">
        {!hideFolder && (
          <div className="space-y-1.5">
            <Label htmlFor="f-folder">Folder</Label>
            <NativeSelect id="f-folder" value={active.folderId ?? ""} onChange={(e) => set({ folderId: e.target.value || null })}>
              <option value="">Any folder</option>
              {folderOptions.map((f) => <option key={f.id} value={f.id}>{f.path}</option>)}
            </NativeSelect>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Tags</Label>
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tags yet. Add tags when saving a bookmark.</p>
          ) : (
            <div className="scroll-thin flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {tags.slice(0, 60).map((t) => {
                const on = active.tags.some((x) => x.toLowerCase() === t.name.toLowerCase());
                return (
                  <button key={t.id} type="button" aria-pressed={on} onClick={() => toggleTag(t.name)}
                    className={cn("rounded-md border px-2 py-0.5 text-xs transition-colors", on ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}>
                    #{t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-domain">Domain</Label>
            <NativeSelect id="f-domain" value={active.domain ?? ""} onChange={(e) => set({ domain: e.target.value || null })}>
              <option value="">Any domain</option>
              {active.domain && !domains.some((d) => d.domain === active.domain) && <option value={active.domain}>{active.domain}</option>}
              {domains.map((d) => <option key={d.domain} value={d.domain}>{d.domain} ({d.count})</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-range">Date added</Label>
            <NativeSelect id="f-range" value={active.range ?? ""} onChange={(e) => set({ range: e.target.value || null })}>
              <option value="">Any time</option>
              {Object.entries(RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="f-fav" checked={active.favorite} onCheckedChange={(v) => set({ favorite: v === true ? "true" : null })} />
          <Label htmlFor="f-fav" className="font-normal">Favorites only</Label>
        </div>
        {count > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => set({ folderId: null, tag: [], domain: null, favorite: null, range: null })}>
            Clear all filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ActiveFilterBadges({ hideFolder }: { hideFolder?: boolean }) {
  const { folders } = useLibrary();
  const { set } = useQueryParams();
  const a = useActiveFilters(hideFolder);
  const paths = buildPathMap(folders);
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (a.folderId) chips.push({ key: "folder", label: `Folder: ${paths.get(a.folderId) ?? "Unknown"}`, remove: () => set({ folderId: null }) });
  a.tags.forEach((t) => chips.push({ key: `tag-${t}`, label: `Tag: ${t}`, remove: () => set({ tag: a.tags.filter((x) => x !== t) }) }));
  if (a.domain) chips.push({ key: "domain", label: `Domain: ${a.domain}`, remove: () => set({ domain: null }) });
  if (a.favorite) chips.push({ key: "fav", label: "Favorites", remove: () => set({ favorite: null }) });
  if (a.range) chips.push({ key: "range", label: RANGE_LABELS[a.range] ?? a.range, remove: () => set({ range: null }) });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((c) => (
        <Badge key={c.key} variant="default" className="gap-1 py-1 pl-2 pr-1 text-[13px]">
          {c.label}
          <button type="button" onClick={c.remove} aria-label={`Remove filter ${c.label}`} className="rounded p-0.5 hover:bg-foreground/10"><X /></button>
        </Badge>
      ))}
    </div>
  );
}
