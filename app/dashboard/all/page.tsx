import { LibraryPage } from "@/components/bookmarks/library-page";

export const metadata = { title: "All Bookmarks" };

export default function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryPage searchParams={searchParams} crumbs={[{ label: "Library" }]} title="All Bookmarks" subtitle="Your saved links, organized your way." emptyKind="library" />;
}
