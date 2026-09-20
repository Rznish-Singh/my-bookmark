"use client";
import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const TooltipProvider = T.Provider;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;
export function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof T.Content>) {
  return (
    <T.Portal>
      <T.Content sideOffset={sideOffset} className={cn("z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md", className)} {...props} />
    </T.Portal>
  );
}
