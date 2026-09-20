import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/** SSRF protection for server-side metadata fetching. */

export class UnsafeUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

export function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) >>> 0 === (ipv4ToInt(base) & mask) >>> 0;
    });
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe[89ab]|ff)/.test(lower);
  }
  return true; // unknown format: treat as unsafe
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata"]);

export function assertSafeHostname(hostname: string): void {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(h) || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
    throw new UnsafeUrlError("Host is not allowed");
  }
  if (net.isIP(h) && isPrivateIp(h)) throw new UnsafeUrlError("Address is not allowed");
}

/** DNS lookup that refuses private results at connection time (defeats DNS rebinding). */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const safe = list.filter((a) => !isPrivateIp(a.address));
    if (safe.length === 0) return callback(new UnsafeUrlError("Resolved to a private address"), "", 4);
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, safe);
    callback(null, safe[0].address, safe[0].family);
  });
};

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowedContentTypes?: RegExp;
}

export interface SafeFetchResult {
  finalUrl: string;
  contentType: string;
  body: string;
}

/**
 * Fetches text over http(s) with: private-IP blocking, redirect re-validation,
 * timeout, size cap and content-type allowlist. Never executes any content.
 */
export async function safeFetchText(input: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const { timeoutMs = 6000, maxBytes = 1_000_000, maxRedirects = 4, allowedContentTypes = /^(text\/html|application\/xhtml\+xml)/i } = opts;
  let current = input;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = new URL(current);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("Only http(s) URLs are allowed");
    assertSafeHostname(url.hostname);

    const res = await requestOnce(url, timeoutMs, maxBytes, allowedContentTypes);
    if (res.redirect) {
      current = new URL(res.redirect, url).toString();
      continue;
    }
    return { finalUrl: url.toString(), contentType: res.contentType, body: res.body };
  }
  throw new Error("Too many redirects");
}

interface OnceResult { redirect?: string; contentType: string; body: string }

function requestOnce(url: URL, timeoutMs: number, maxBytes: number, allowed: RegExp): Promise<OnceResult> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: timeoutMs,
        headers: {
          "user-agent": "BookmarkVaultBot/1.0 (+metadata fetch)",
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          return resolve({ redirect: location, contentType: "", body: "" });
        }
        const contentType = String(res.headers["content-type"] ?? "");
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(new Error(`Unexpected status ${status}`));
        }
        if (!allowed.test(contentType)) {
          res.resume();
          return reject(new Error("Unsupported content type"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            // Enough for <head>; stop reading rather than failing.
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        const finish = () => resolve({ contentType, body: Buffer.concat(chunks).toString("utf8") });
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

/** Tiny in-memory rate limiter. Swap for Redis later behind the same interface. */
export interface RateLimiter {
  check(key: string): boolean;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}
