import { z } from "zod";
import { authed, readJson } from "@/lib/api";
import { deleteTag, renameTag } from "@/lib/services/tag-service";
import { tagBodySchema } from "@/lib/validators/folder";

type P = { id: string };
const id = z.uuid();

export const PATCH = authed<P>(async ({ req, user, params }) => {
  const { name } = tagBodySchema.parse(await readJson(req));
  return renameTag(user.id, id.parse(params.id), name);
});

export const DELETE = authed<P>(async ({ user, params }) => {
  await deleteTag(user.id, id.parse(params.id));
  return { ok: true };
});
