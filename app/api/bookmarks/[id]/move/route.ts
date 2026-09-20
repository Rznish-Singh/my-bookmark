import { z } from "zod";
import { authed, readJson } from "@/lib/api";
import { moveBookmark } from "@/lib/services/bookmark-service";
import { moveBookmarkSchema } from "@/lib/validators/bookmark";

export const POST = authed<{ id: string }>(async ({ req, user, params }) => {
  const { folderId } = moveBookmarkSchema.parse(await readJson(req));
  return moveBookmark(user.id, z.uuid().parse(params.id), folderId);
});
