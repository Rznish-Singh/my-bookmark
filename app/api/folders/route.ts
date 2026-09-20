import { authed, readJson } from "@/lib/api";
import { createFolder, listFolders } from "@/lib/services/folder-service";
import { createFolderSchema } from "@/lib/validators/folder";

export const GET = authed(async ({ user }) => ({ folders: await listFolders(user.id) }));

export const POST = authed(async ({ req, user }) => {
  const body = createFolderSchema.parse(await readJson(req));
  return Response.json(await createFolder(user.id, body), { status: 201 });
});
