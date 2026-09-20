import { LibraryPage } from "@/components/bookmarks/library-page";

export const metadata = { title: "Search" };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tag = typeof sp.tag === "string" ? sp.tag : Array.isArray(sp.tag) ? sp.tag.join(", ") : "";
  const title = q ? `Results for “${q}”` : tag ? `Tagged #${tag}` : "Search";
  return <LibraryPage searchParams={Promise.resolve(sp)} crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Search" }]} title={title} subtitle="Matches title, URL, domain, description, notes, tags and folders." emptyKind="search" />;
}
