"use client";
import { useCallback, useSyncExternalStore } from "react";

/** Boolean persisted in localStorage, SSR-safe (server + first client render use `false`). */
export function useStoredFlag(key: string): [boolean, (v: boolean) => void] {
  const event = `bv-flag:${key}`;
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(event, cb);
    return () => { window.removeEventListener("storage", cb); window.removeEventListener(event, cb); };
  }, [event]);
  const value = useSyncExternalStore(
    subscribe,
    () => { try { return localStorage.getItem(key) === "1"; } catch { return false; } },
    () => false,
  );
  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(event));
  }, [key, event]);
  return [value, set];
}

/** Persisted view preference (read on the server from this cookie). */
export function setViewCookie(v: "grid" | "list") {
  document.cookie = `bv_view=${v}; path=/; max-age=31536000; samesite=lax`;
}
