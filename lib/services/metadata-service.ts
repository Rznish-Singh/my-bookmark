import { Parser } from "htmlparser2";
import { extractDomain, isHttpUrl } from "@/lib/utils/normalize-url";
import { safeFetchText } from "@/lib/utils/security";

export interface Metadata {
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
  domain: string;
}

export interface MetadataService {
  fetchMetadata(url: string): Promise<Metadata>;
}

function absolute(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try {
    const u = new URL(href.trim(), base);
    return isHttpUrl(u.toString()) ? u.toString() : null;
  } catch {
    return null;
  }
}

const clip = (s: string | undefined | null, n: number) => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : null;
};

/** Pure HTML -> metadata extraction. Never executes scripts; only reads <head> tags. */
export function extractMetadata(html: string, pageUrl: string): Metadata {
  const meta: Record<string, string> = {};
  let titleTag = "";
  let inTitle = false;
  let icon: string | null = null;
  let appleIcon: string | null = null;
  let done = false;

  const parser = new Parser(
    {
      onopentag(name, a) {
        if (done) return;
        if (name === "title") inTitle = true;
        else if (name === "meta") {
          const key = (a.property || a.name || "").toLowerCase();
          if (key && a.content && !(key in meta)) meta[key] = a.content;
        } else if (name === "link") {
          const rel = (a.rel || "").toLowerCase();
          if (/(^|\s)icon(\s|$)/.test(rel) && !icon) icon = a.href;
          else if (rel.includes("apple-touch-icon") && !appleIcon) appleIcon = a.href;
        } else if (name === "body") done = true;
      },
      ontext(t) {
        if (inTitle && !done) titleTag += t;
      },
      onclosetag(name) {
        if (name === "title") inTitle = false;
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();

  const domain = extractDomain(pageUrl);
  return {
    title: clip(meta["og:title"] || meta["twitter:title"] || titleTag, 300),
    description: clip(meta["og:description"] || meta["description"] || meta["twitter:description"], 500),
    favicon: absolute(icon ?? appleIcon ?? "/favicon.ico", pageUrl),
    image: absolute(meta["og:image"] || meta["twitter:image"], pageUrl),
    domain,
  };
}

export class HttpMetadataService implements MetadataService {
  async fetchMetadata(url: string): Promise<Metadata> {
    const { body, finalUrl } = await safeFetchText(url, { maxBytes: 400_000 });
    return extractMetadata(body, finalUrl);
  }
}

export const metadataService: MetadataService = new HttpMetadataService();
