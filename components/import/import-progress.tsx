import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ImportSummary } from "@/lib/services/import-service";

export function ImportProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin text-primary" /> Importing bookmarks…</div>
      <Progress value={pct} aria-label="Import progress" />
      <p className="text-sm tabular-nums text-muted-foreground">{done.toLocaleString()} / {total.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">Keep this tab open. The import is all-or-nothing, so if anything fails nothing is added.</p>
    </div>
  );
}

export function ImportDone({ summary, onAnother }: { summary: ImportSummary; onAnother: () => void }) {
  return (
    <div className="space-y-5 rounded-xl border bg-card p-6" role="status">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight"><CheckCircle2 className="size-5 text-primary" /> Import complete</div>
      <ul className="space-y-1 text-sm">
        <li><span className="font-medium tabular-nums">{summary.bookmarksImported.toLocaleString()}</span> bookmarks imported</li>
        <li><span className="font-medium tabular-nums">{summary.foldersCreated.toLocaleString()}</span> folders created{summary.foldersMerged > 0 && <span className="text-muted-foreground"> · {summary.foldersMerged.toLocaleString()} merged into existing folders</span>}</li>
        <li><span className="font-medium tabular-nums">{summary.duplicatesDetected.toLocaleString()}</span> duplicates detected{summary.duplicatesSkipped > 0 && <span className="text-muted-foreground"> and skipped</span>}</li>
        {summary.linksIgnored > 0 && <li className="text-muted-foreground">{summary.linksIgnored.toLocaleString()} unsupported links ignored</li>}
      </ul>
      <div className="flex gap-2">
        <Button asChild><Link href="/dashboard">Go to Library</Link></Button>
        <Button variant="outline" onClick={onAnother}>Import another file</Button>
      </div>
    </div>
  );
}
