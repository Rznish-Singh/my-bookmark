"use client";
import * as React from "react";
import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverContent = ({ className, align = "start", sideOffset = 6, ...p }: React.ComponentProps<typeof P.Content>) => (
  <P.Portal>
    <P.Content align={align} sideOffset={sideOffset} className={cn("z-50 w-80 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg outline-none", className)} {...p} />
  </P.Portal>
);
