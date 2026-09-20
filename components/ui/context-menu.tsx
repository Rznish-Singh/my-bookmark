"use client";
import * as React from "react";
import { ContextMenu as M } from "radix-ui";
import { cn } from "@/lib/utils/cn";
import { menuContent, menuItem } from "./menu-parts";

export const ContextMenu = M.Root;
export const ContextMenuTrigger = M.Trigger;
export const ContextMenuContent = ({ className, ...p }: React.ComponentProps<typeof M.Content>) => (
  <M.Portal><M.Content className={cn(menuContent, className)} {...p} /></M.Portal>
);
export const ContextMenuItem = ({ className, variant, ...p }: React.ComponentProps<typeof M.Item> & { variant?: "destructive" }) => (
  <M.Item data-variant={variant} className={cn(menuItem, className)} {...p} />
);
export const ContextMenuSeparator = ({ className, ...p }: React.ComponentProps<typeof M.Separator>) => <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...p} />;
