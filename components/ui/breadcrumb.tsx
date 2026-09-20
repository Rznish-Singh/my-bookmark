import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils/cn";

export interface Crumb { label: string; href?: string }

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        {items.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            <li className={cn(i === items.length - 1 && "font-medium text-foreground")} aria-current={i === items.length - 1 ? "page" : undefined}>
              {c.href && i < items.length - 1 ? <Link href={c.href} className="hover:text-foreground hover:underline">{c.label}</Link> : c.label}
            </li>
            {i < items.length - 1 && <li aria-hidden><ChevronRight className="size-3.5" /></li>}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
