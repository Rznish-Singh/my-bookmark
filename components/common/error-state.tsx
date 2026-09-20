"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function ErrorState({ title = "Something went wrong", description = "We couldn't load this page. Try again in a moment.", onRetry }: {
  title?: string; description?: string; onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<TriangleAlert />}
      title={title}
      description={description}
      actions={onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    />
  );
}
