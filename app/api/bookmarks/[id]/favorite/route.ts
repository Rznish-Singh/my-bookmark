import { z } from "zod";
import { authed, readJson } from "@/lib/api";
import { setFavorite } from "@/lib/services/bookmark-service";
import { favoriteSchema } from "@/lib/validators/bookmark";

export const POST = authed<{ id: string }>(async ({ req, user, params }) => {
  const body = favoriteSchema.parse(await readJson(req).catch(() => ({})));
  return setFavorite(user.id, z.uuid().parse(params.id), body.isFavorite);
});
