import { cn } from "@/lib/utils/cn";

export function EmptyState({ icon, title, description, actions, className }: {
  icon?: React.ReactNode; title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center", className)}>
      {icon && <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">{icon}</div>}
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
