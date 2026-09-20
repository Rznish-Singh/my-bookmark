import { z } from "zod";
import { authed, readJson } from "@/lib/api";
import { deleteBookmark, getBookmark, updateBookmark } from "@/lib/services/bookmark-service";
import { updateBookmarkSchema } from "@/lib/validators/bookmark";

type P = { id: string };
const id = z.uuid();

export const GET = authed<P>(async ({ user, params }) => getBookmark(user.id, id.parse(params.id)));

export const PATCH = authed<P>(async ({ req, user, params }) =>
  updateBookmark(user.id, id.parse(params.id), updateBookmarkSchema.parse(await readJson(req))),
);

export const DELETE = authed<P>(async ({ user, params }) => {
  await deleteBookmark(user.id, id.parse(params.id));
  return { ok: true };
});
