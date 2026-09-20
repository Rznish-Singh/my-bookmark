import { PageHeader } from "@/components/layout/page-header";
import { TagsManager } from "@/components/tags/tags-manager";

export const metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Tags" }]} title="Tags" subtitle="Click a tag to see its bookmarks." actions="none" />
      <TagsManager />
    </>
  );
}
