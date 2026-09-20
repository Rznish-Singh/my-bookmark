import { notFound } from "next/navigation";
import { z } from "zod";
import { LibraryPage } from "@/components/bookmarks/library-page";
import { requireUser } from "@/lib/auth";
import { buildPathMap, listFolders } from "@/lib/services/folder-service";

export default async function FolderPage({ params, searchParams }: { params: Promise<{ folderId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { folderId } = await params;
  if (!z.uuid().safeParse(folderId).success) notFound();
  const user = await requireUser();
  const folders = await listFolders(user.id);
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) notFound(); // also covers other users' folders
  const paths = buildPathMap(folders);
  const trail: { label: string; href?: string }[] = [];
  let cur: typeof folder | undefined = folder;
  while (cur) { trail.unshift({ label: cur.name, href: `/dashboard/folder/${cur.id}` }); cur = folders.find((f) => f.id === cur!.parentId); }
  return (
    <LibraryPage
      searchParams={searchParams}
      crumbs={[{ label: "Library", href: "/dashboard" }, ...trail]}
      title={folder.name}
      subtitle={paths.get(folder.id)}
      fixed={{ folderId, includeSubfolders: true }}
      emptyKind="folder"
      folderId={folderId}
      hideFolderFilter
    />
  );
}
