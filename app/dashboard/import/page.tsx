import { ImportFlow } from "@/components/import/import-flow";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Library", href: "/dashboard" }, { label: "Import" }]} title="Import Bookmarks" subtitle="Import your browser bookmarks from an HTML export." actions="none" />
      <ImportFlow />
      <details className="mt-8 max-w-3xl text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">How do I export bookmarks from my browser?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Chrome / Edge:</strong> Bookmark manager (Ctrl/⌘ Shift O) → ⋮ → Export bookmarks.</li>
          <li><strong>Firefox:</strong> Bookmarks → Manage bookmarks → Import and Backup → Export Bookmarks to HTML.</li>
          <li><strong>Safari:</strong> File → Export → Bookmarks…</li>
        </ul>
      </details>
    </>
  );
}
