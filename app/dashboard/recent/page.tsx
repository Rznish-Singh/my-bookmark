import { LibraryPage } from "@/components/bookmarks/library-page";

export const metadata = { title: "Recent" };

export default function Recent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryPage searchParams={searchParams} crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Recent" }]} title="Recent" subtitle="Your 50 most recently added bookmarks." fixed={{ sort: "newest", page: 1, pageSize: 50 }} emptyKind="recent" paginate={false} lockSort />;
}
