"use client";
import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils/cn";
import { menuContent, menuItem } from "./menu-parts";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;
export const DropdownMenuContent = ({ className, sideOffset = 4, ...p }: React.ComponentProps<typeof M.Content>) => (
  <M.Portal><M.Content sideOffset={sideOffset} className={cn(menuContent, className)} {...p} /></M.Portal>
);
export const DropdownMenuItem = ({ className, variant, ...p }: React.ComponentProps<typeof M.Item> & { variant?: "destructive" }) => (
  <M.Item data-variant={variant} className={cn(menuItem, className)} {...p} />
);
export const DropdownMenuLabel = ({ className, ...p }: React.ComponentProps<typeof M.Label>) => <M.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...p} />;
export const DropdownMenuSeparator = ({ className, ...p }: React.ComponentProps<typeof M.Separator>) => <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...p} />;
export const DropdownMenuRadioGroup = M.RadioGroup;
export const DropdownMenuRadioItem = ({ className, children, ...p }: React.ComponentProps<typeof M.RadioItem>) => (
  <M.RadioItem className={cn(menuItem, "pl-7", className)} {...p}>
    <span className="absolute left-2 flex size-3.5 items-center justify-center"><M.ItemIndicator><span className="size-1.5 rounded-full bg-primary" /></M.ItemIndicator></span>
    {children}
  </M.RadioItem>
);
