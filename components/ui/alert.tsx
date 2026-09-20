import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const alertVariants = cva("relative flex gap-3 rounded-lg border p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-card",
      warning: "border-star/40 bg-star/10 [&>svg]:text-star",
      destructive: "border-destructive/40 bg-destructive/10 text-destructive",
      success: "border-primary/30 bg-accent text-accent-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({ className, variant, ...p }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...p} />;
}
export const AlertTitle = ({ className, ...p }: React.ComponentProps<"p">) => <p className={cn("font-medium leading-snug", className)} {...p} />;
export const AlertDescription = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("mt-0.5 text-[13px] opacity-90", className)} {...p} />;
