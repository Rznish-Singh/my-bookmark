import { authed, readJson } from "@/lib/api";
import { createTag, listTags } from "@/lib/services/tag-service";
import { tagBodySchema } from "@/lib/validators/folder";

export const GET = authed(async ({ user }) => ({ tags: await listTags(user.id) }));

export const POST = authed(async ({ req, user }) => {
  const { name } = tagBodySchema.parse(await readJson(req));
  return Response.json(await createTag(user.id, name), { status: 201 });
});
