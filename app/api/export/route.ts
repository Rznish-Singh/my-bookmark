import { authed } from "@/lib/api";
import { exportHtml, exportJson } from "@/lib/services/export-service";

export const GET = authed(async ({ req, user }) => {
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "html";
  const stamp = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? await exportJson(user.id) : await exportHtml(user.id);
  return new Response(body, {
    headers: {
      "content-type": format === "json" ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="bookmark-vault-${stamp}.${format}"`,
      "cache-control": "no-store",
    },
  });
});
