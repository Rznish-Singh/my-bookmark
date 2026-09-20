/**
 * URL normalisation used for duplicate detection.
 * The original URL is always stored separately; this value is only a comparison key.
 */

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "igshid",
  "yclid", "_hsenc", "_hsmi", "ref_src", "ref_url", "spm",
]);

function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith("utm_") || TRACKING_PARAMS.has(k);
}

export function normalizeUrl(input: string): string {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return raw.toLowerCase();
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  // URL already drops default ports (80 for http, 443 for https).

  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key)) url.searchParams.delete(key);
  }
  // Stable ordering so ?a=1&b=2 equals ?b=2&a=1. Values are left untouched.
  url.searchParams.sort();

  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "") || "/";
  url.pathname = path;

  let out = url.toString();
  if (out.endsWith("/") && !url.search) out = out.slice(0, -1);
  return out;
}

export function extractDomain(input: string): string {
  try {
    const host = new URL(input).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Only http(s) links are accepted as bookmarks. */
export function isHttpUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
