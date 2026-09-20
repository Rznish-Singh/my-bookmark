"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/** Read/write URL search params. Filters live in the URL so views are shareable and server-rendered. */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = useCallback(
    (updates: Record<string, string | string[] | null | undefined>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        next.delete(k);
        if (Array.isArray(v)) v.forEach((x) => next.append(k, x));
        else if (v !== null && v !== undefined && v !== "") next.set(k, v);
      }
      if (!opts.keepPage) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  return { params, set, pending };
}
