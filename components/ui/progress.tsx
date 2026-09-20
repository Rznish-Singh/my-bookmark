import { Progress as P } from "radix-ui";
import { cn } from "@/lib/utils/cn";
export function Progress({ className, value, ...props }: React.ComponentProps<typeof P.Root>) {
  return (
    <P.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} value={value} {...props}>
      <P.Indicator className="h-full bg-primary transition-[width] duration-200" style={{ width: `${value ?? 0}%` }} />
    </P.Root>
  );
}
