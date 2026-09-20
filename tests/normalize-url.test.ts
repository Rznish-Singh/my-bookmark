import { describe, expect, it } from "vitest";
import { extractDomain, isHttpUrl, normalizeUrl } from "@/lib/utils/normalize-url";
import { isPrivateIp, assertSafeHostname } from "@/lib/utils/security";

describe("normalizeUrl", () => {
  it("treats host casing and trailing slash as equivalent", () => {
    expect(normalizeUrl("https://EXAMPLE.com/")).toBe(normalizeUrl("https://example.com"));
    expect(normalizeUrl("https://example.com/docs/")).toBe(normalizeUrl("https://example.com/docs"));
  });
  it("drops default ports and fragments", () => {
    expect(normalizeUrl("https://example.com:443/a#top")).toBe("https://example.com/a");
    expect(normalizeUrl("http://example.com:80/a")).toBe("http://example.com/a");
    expect(normalizeUrl("http://example.com:8080/a")).toBe("http://example.com:8080/a");
  });
  it("removes tracking params but keeps meaningful ones", () => {
    expect(normalizeUrl("https://example.com/p?utm_source=x&id=7&fbclid=abc")).toBe("https://example.com/p?id=7");
    expect(normalizeUrl("https://example.com/p?b=2&a=1")).toBe(normalizeUrl("https://example.com/p?a=1&b=2"));
    expect(normalizeUrl("https://example.com/watch?v=abc")).not.toBe(normalizeUrl("https://example.com/watch?v=def"));
  });
  it("adds https when the scheme is missing", () => {
    expect(normalizeUrl("example.com/a")).toBe("https://example.com/a");
  });
  it("extracts domains and validates protocols", () => {
    expect(extractDomain("https://www.GitHub.com/x")).toBe("github.com");
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("https://a.example")).toBe(true);
  });
});

describe("SSRF guards", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.20.0.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"])(
    "blocks %s",
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])("allows %s", (ip) =>
    expect(isPrivateIp(ip)).toBe(false),
  );
  it("blocks internal hostnames", () => {
    expect(() => assertSafeHostname("localhost")).toThrow();
    expect(() => assertSafeHostname("metadata.google.internal")).toThrow();
    expect(() => assertSafeHostname("printer.local")).toThrow();
    expect(() => assertSafeHostname("[::1]")).toThrow();
    expect(() => assertSafeHostname("example.com")).not.toThrow();
  });
});
