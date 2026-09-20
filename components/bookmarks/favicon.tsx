"use client";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Favicon({ src, domain, className }: { src?: string | null; domain: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (domain.replace(/^www\./, "")[0] ?? "?").toUpperCase();
  if (!src || failed) {
    return (
      <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground", className)}>
        {initial}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts; next/image would need an allowlist
  return <img src={src} alt="" width={20} height={20} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn("size-5 shrink-0 rounded", className)} />;
}
