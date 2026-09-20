import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { countBookmarks } from "@/lib/services/bookmark-service";
import { getFolderTree } from "@/lib/services/folder-service";
import { listTags } from "@/lib/services/tag-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [tree, tags, totalCount] = await Promise.all([getFolderTree(user.id), listTags(user.id), countBookmarks(user.id)]);
  return (
    <AppShell user={{ name: user.name, email: user.email }} tree={tree} tags={tags} totalCount={totalCount}>
      {children}
    </AppShell>
  );
}
