import { Separator as S } from "radix-ui";
import { cn } from "@/lib/utils/cn";
export function Separator({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof S.Root>) {
  return <S.Root orientation={orientation} decorative className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...props} />;
}
