"use client";
import { Download, FileJson, Import, Laptop, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/components/layout/library-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { plural } from "@/lib/client/format";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";

const SHORTCUTS: [string[], string][] = [
  [["⌘/Ctrl", "K"], "Search bookmarks"],
  [["⌘/Ctrl", "B"], "Add bookmark"],
  [["⌘/Ctrl", "Shift", "F"], "Go to favorites"],
  [["↑", "↓"], "Navigate search results"],
  [["Enter"], "Open selected result"],
  [["Esc"], "Close dialog or palette"],
];

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 space-y-4">
      <div><h2 id={`${id}-h`} className="text-base font-semibold tracking-tight">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { user, totalCount, folders, tags } = useLibrary();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const themes = [["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Laptop]] as const;

  return (
    <div className="max-w-2xl space-y-10">
      <Section id="profile" title="Profile">
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2 rounded-xl border bg-card p-4 text-sm">
          <dt className="text-muted-foreground">Name</dt><dd>{user.name}</dd>
          <dt className="text-muted-foreground">Email</dt><dd>{user.email}</dd>
        </dl>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }}><LogOut /> Sign out</Button>
          <span className="text-xs text-muted-foreground">Editing profile details <Badge variant="outline">Coming soon</Badge></span>
        </div>
      </Section>
      <Separator />
      <Section id="appearance" title="Appearance" description="Choose how Bookmark Vault looks.">
        <div className="grid max-w-md grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {themes.map(([v, label, Icon]) => (
            <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => setTheme(v)}
              className={cn("flex flex-col items-center gap-2 rounded-lg border bg-card px-3 py-4 text-sm transition-colors hover:bg-muted", theme === v && "border-primary bg-accent text-accent-foreground")}>
              <Icon className="size-5" />{label}
            </button>
          ))}
        </div>
      </Section>
      <Separator />
      <Section id="import-export" title="Import / Export" description="Your data is yours. Export works with any browser.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/import"><Import /> Import bookmarks</Link></Button>
          <Button variant="outline" asChild><a href="/api/export?format=html" download><Download /> Export HTML (browser format)</a></Button>
          <Button variant="outline" asChild><a href="/api/export?format=json" download><FileJson /> Export JSON</a></Button>
        </div>
      </Section>
      <Separator />
      <Section id="shortcuts" title="Keyboard shortcuts">
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between px-4 py-2.5">
              <span>{label}</span>
              <span className="flex gap-1">{keys.map((k) => <kbd key={k} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Separator />
      <Section id="data" title="Data management">
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {[["Bookmarks", totalCount], ["Folders", folders.length], ["Tags", tags.length]].map(([l, n]) => (
            <div key={l as string} className="rounded-lg border bg-card p-3"><dd className="text-xl font-semibold tabular-nums">{(n as number).toLocaleString()}</dd><dt className="text-xs text-muted-foreground">{l}</dt></div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">You have {plural(totalCount, "bookmark")}. Bulk delete, dead-link checks and account deletion <Badge variant="outline">Coming soon</Badge></p>
      </Section>
    </div>
  );
}
