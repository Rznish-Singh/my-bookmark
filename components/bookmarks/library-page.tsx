import { cookies } from "next/headers";
import { BookmarkBrowser, type ViewMode } from "@/components/bookmarks/bookmark-browser";
import { LibraryEmpty } from "@/components/bookmarks/empty-states";
import { PageHeader } from "@/components/layout/page-header";
import type { Crumb } from "@/components/ui/breadcrumb";
import { requireUser } from "@/lib/auth";
import { plural } from "@/lib/client/format";
import { listDomains } from "@/lib/services/bookmark-service";
import { searchService } from "@/lib/services/search-service";
import { parseListQuery, type ListQuery } from "@/lib/validators/bookmark";

type SP = Record<string, string | string[] | undefined>;

export async function LibraryPage({ searchParams, crumbs, title, subtitle, fixed = {}, emptyKind, folderId, hideFolderFilter, paginate = true, lockSort }: {
  searchParams: Promise<SP>;
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  fixed?: Partial<ListQuery>;
  emptyKind: "library" | "folder" | "favorites" | "recent" | "search";
  folderId?: string;
  hideFolderFilter?: boolean;
  paginate?: boolean;
  lockSort?: boolean;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) (Array.isArray(v) ? v : v === undefined ? [] : [v]).forEach((x) => usp.append(k, x));

  let query: ListQuery;
  try {
    query = parseListQuery(usp);
  } catch {
    query = parseListQuery(new URLSearchParams()); // malformed params: fall back to defaults
  }
  query = { ...query, ...fixed };

  const [page, domains, jar] = await Promise.all([searchService.searchBookmarks(user.id, query), listDomains(user.id), cookies()]);
  const view: ViewMode = jar.get("bv_view")?.value === "list" ? "list" : "grid";

  return (
    <>
      <PageHeader crumbs={crumbs} title={title} subtitle={subtitle} count={plural(page.total, "bookmark")} folderId={folderId} />
      <BookmarkBrowser page={page} view={view} domains={domains} hideFolderFilter={hideFolderFilter} paginate={paginate} lockSort={lockSort} empty={<LibraryEmpty kind={emptyKind} folderId={folderId} />} />
    </>
  );
}
