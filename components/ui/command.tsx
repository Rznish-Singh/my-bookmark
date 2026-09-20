"use client";
import * as React from "react";
import { Command as C } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export const Command = ({ className, ...p }: React.ComponentProps<typeof C>) => (
  <C className={cn("flex w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground", className)} {...p} />
);

export function CommandDialog({ open, onOpenChange, title, children, commandProps }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode;
  commandProps?: React.ComponentProps<typeof C>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Type to search. Use arrow keys to move and Enter to open.</DialogDescription>
        <Command {...commandProps}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

export const CommandInput = ({ className, ...p }: React.ComponentProps<typeof C.Input>) => (
  <div className="flex items-center gap-2 border-b px-3">
    <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    <C.Input className={cn("h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground", className)} {...p} />
  </div>
);
export const CommandList = ({ className, ...p }: React.ComponentProps<typeof C.List>) => (
  <C.List className={cn("scroll-thin max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5", className)} {...p} />
);
export const CommandEmpty = (p: React.ComponentProps<typeof C.Empty>) => <C.Empty className="py-10 text-center text-sm text-muted-foreground" {...p} />;
export const CommandGroup = ({ className, ...p }: React.ComponentProps<typeof C.Group>) => (
  <C.Group className={cn("[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...p} />
);
export const CommandItem = ({ className, ...p }: React.ComponentProps<typeof C.Item>) => (
  <C.Item className={cn("flex cursor-default items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none data-[selected=true]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0", className)} {...p} />
);
export const CommandLoading = C.Loading;
