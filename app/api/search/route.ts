import { authed } from "@/lib/api";
import { searchService } from "@/lib/services/search-service";
import { parseListQuery } from "@/lib/validators/bookmark";

export const GET = authed(async ({ req, user }) => {
  return searchService.searchBookmarks(user.id, parseListQuery(new URL(req.url).searchParams));
});
