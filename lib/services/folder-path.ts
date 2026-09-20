/** Pure folder helpers with no database import, safe for client bundles. */
export interface PathNode { id: string; parentId: string | null; name: string }

export function buildPathMap(list: PathNode[]): Map<string, string> {
  const byId = new Map(list.map((f) => [f.id, f]));
  const paths = new Map<string, string>();
  const pathOf = (id: string, guard = 0): string => {
    const f = byId.get(id);
    if (!f || guard > 100) return "";
    const cached = paths.get(id);
    if (cached) return cached;
    const p = f.parentId ? `${pathOf(f.parentId, guard + 1)} / ${f.name}` : f.name;
    paths.set(id, p);
    return p;
  };
  list.forEach((f) => pathOf(f.id));
  return paths;
}

export function descendantIds(list: Pick<PathNode, "id" | "parentId">[], rootId: string): string[] {
  const byParent = new Map<string | null, string[]>();
  for (const f of list) byParent.set(f.parentId, [...(byParent.get(f.parentId) ?? []), f.id]);
  const out: string[] = [];
  const walk = (id: string) => {
    for (const child of byParent.get(id) ?? []) {
      out.push(child);
      walk(child);
    }
  };
  walk(rootId);
  return out;
}

export function wouldCreateCycle(list: Pick<PathNode, "id" | "parentId">[], folderId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === folderId) return true;
  return descendantIds(list, folderId).includes(newParentId);
}
