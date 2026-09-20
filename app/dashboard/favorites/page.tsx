import { LibraryPage } from "@/components/bookmarks/library-page";

export const metadata = { title: "Favorites" };

export default function Favorites({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryPage searchParams={searchParams} crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Favorites" }]} title="Favorites" subtitle="Links you starred." fixed={{ favorite: true }} emptyKind="favorites" />;
}
