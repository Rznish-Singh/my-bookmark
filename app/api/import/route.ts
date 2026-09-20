import { authed, readJson, toErrorResponse } from "@/lib/api";
import { previewImport, runImport } from "@/lib/services/import-service";
import { importBodySchema } from "@/lib/validators/import";

export const maxDuration = 60;

/**
 * dryRun=true  -> JSON preview (counts + folder tree), nothing is written.
 * dryRun=false -> NDJSON stream: {type:"progress",done,total} ... {type:"done",summary}
 */
export const POST = authed(async ({ req, user }) => {
  const body = importBodySchema.parse(await readJson(req));
  if (body.dryRun) return previewImport(user.id, body.html);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const summary = await runImport(user.id, body.html, {
          skipDuplicates: body.skipDuplicates,
          mergeFolders: body.mergeFolders,
          onProgress: (done, total) => send({ type: "progress", done, total }),
        });
        send({ type: "done", summary });
      } catch (err) {
        const res = toErrorResponse(err);
        send({ type: "error", message: (await res.json()).error.message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
});
