import { authed, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { findDuplicate } from "@/lib/services/bookmark-service";
import { metadataService } from "@/lib/services/metadata-service";
import { createRateLimiter } from "@/lib/utils/security";
import { urlSchema } from "@/lib/validators/bookmark";
import { metadataBodySchema } from "@/lib/validators/import";
import { extractDomain } from "@/lib/utils/normalize-url";

const limiter = createRateLimiter(30, 60_000);

/** Server-side metadata lookup (SSRF-guarded). Failure is reported softly so the UI can continue. */
export const POST = authed(async ({ req, user }) => {
  if (!limiter.check(user.id)) throw new AppError(429, "rate_limited", "Slow down a little and try again.");
  const { url: raw } = metadataBodySchema.parse(await readJson(req));
  const url = urlSchema.parse(raw);
  const duplicate = await findDuplicate(user.id, url);
  try {
    const metadata = await metadataService.fetchMetadata(url);
    return { url, metadata, duplicate, fetched: true };
  } catch (err) {
    console.warn("[metadata] fetch failed", url, err instanceof Error ? err.message : err);
    return {
      url,
      metadata: { title: null, description: null, favicon: null, image: null, domain: extractDomain(url) },
      duplicate,
      fetched: false,
    };
  }
});
