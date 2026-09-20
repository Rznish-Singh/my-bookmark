"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  // Never render error.message: it may contain internals. Log detail only.
  return <ErrorState onRetry={reset} />;
}
