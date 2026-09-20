"use client";
import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const AlertDialog = A.Root;

export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Portal>
      <A.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <A.Content className={cn("fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-card p-5 shadow-xl outline-none", className)} {...props} />
    </A.Portal>
  );
}
export const AlertDialogHeader = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-1.5", className)} {...p} />;
export const AlertDialogFooter = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...p} />;
export const AlertDialogTitle = ({ className, ...p }: React.ComponentProps<typeof A.Title>) => <A.Title className={cn("text-base font-semibold", className)} {...p} />;
export const AlertDialogDescription = ({ className, ...p }: React.ComponentProps<typeof A.Description>) => <A.Description className={cn("text-sm text-muted-foreground", className)} {...p} />;
export const AlertDialogCancel = ({ className, ...p }: React.ComponentProps<typeof A.Cancel>) => <A.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...p} />;
export const AlertDialogAction = ({ className, variant, ...p }: React.ComponentProps<typeof A.Action> & { variant?: "destructive" | "default" }) => (
  <A.Action className={cn(buttonVariants({ variant: variant ?? "default" }), className)} {...p} />
);
