import { z } from "zod";
import { authed, readJson } from "@/lib/api";
import { deleteFolder, getDeleteImpact, updateFolder } from "@/lib/services/folder-service";
import { deleteFolderSchema, updateFolderSchema } from "@/lib/validators/folder";

type P = { id: string };
const id = z.uuid();

/** Returns what deleting this folder would affect (for the confirmation dialog). */
export const GET = authed<P>(async ({ user, params }) => getDeleteImpact(user.id, id.parse(params.id)));

export const PATCH = authed<P>(async ({ req, user, params }) =>
  updateFolder(user.id, id.parse(params.id), updateFolderSchema.parse(await readJson(req))),
);

export const DELETE = authed<P>(async ({ req, user, params }) => {
  const { strategy } = deleteFolderSchema.parse(await readJson(req));
  return deleteFolder(user.id, id.parse(params.id), strategy);
});
