import { authed, readJson } from "@/lib/api";
import { createBookmark } from "@/lib/services/bookmark-service";
import { searchService } from "@/lib/services/search-service";
import { createBookmarkSchema, parseListQuery } from "@/lib/validators/bookmark";

export const GET = authed(async ({ req, user }) => {
  const query = parseListQuery(new URL(req.url).searchParams);
  return searchService.searchBookmarks(user.id, query);
});

export const POST = authed(async ({ req, user }) => {
  const body = createBookmarkSchema.parse(await readJson(req));
  const created = await createBookmark(user.id, body);
  return Response.json(created, { status: 201 });
});
