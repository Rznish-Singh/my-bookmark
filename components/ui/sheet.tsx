"use client";
import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({ className, children, side = "right", ...props }: React.ComponentProps<typeof D.Content> & { side?: "left" | "right" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <D.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[88%] flex-col bg-card shadow-xl outline-none",
          side === "right" ? "right-0 max-w-md border-l" : "left-0 max-w-[19rem] border-r",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
export const SheetHeader = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-1 border-b p-4 pr-10", className)} {...p} />;
export const SheetTitle = ({ className, ...p }: React.ComponentProps<typeof D.Title>) => <D.Title className={cn("text-base font-semibold leading-snug", className)} {...p} />;
export const SheetDescription = ({ className, ...p }: React.ComponentProps<typeof D.Description>) => <D.Description className={cn("text-sm text-muted-foreground", className)} {...p} />;
