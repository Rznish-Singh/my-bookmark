"use client";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLibrary } from "@/components/layout/library-provider";
import { ImportDropzone, validateFile } from "@/components/import/import-dropzone";
import { ImportPreview, type ImportChoices } from "@/components/import/import-preview";
import { ImportDone, ImportProgress } from "@/components/import/import-progress";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/client/api";
import type { ImportPreview as Preview, ImportSummary } from "@/lib/services/import-service";

type Stage =
  | { name: "idle" }
  | { name: "parsing"; fileName: string }
  | { name: "preview"; fileName: string; html: string; preview: Preview }
  | { name: "importing"; done: number; total: number }
  | { name: "done"; summary: ImportSummary };

export function ImportFlow() {
  const { refresh } = useLibrary();
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    const problem = validateFile(file);
    if (problem) return setError(problem);
    setStage({ name: "parsing", fileName: file.name });
    try {
      const html = await file.text();
      const preview = await api<Preview>("/api/import", { method: "POST", body: { html, dryRun: true } });
      setStage({ name: "preview", fileName: file.name, html, preview });
    } catch (e) {
      setError(errorMessage(e));
      setStage({ name: "idle" });
    }
  };

  const runImport = async (html: string, choices: ImportChoices, total: number) => {
    setError(null);
    setStage({ name: "importing", done: 0, total });
    try {
      const res = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html, dryRun: false, ...choices }) });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "The import failed. Nothing was added.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let summary: ImportSummary | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as { type: string; done?: number; total?: number; summary?: ImportSummary; message?: string };
          if (msg.type === "progress") setStage({ name: "importing", done: msg.done ?? 0, total: msg.total ?? total });
          else if (msg.type === "done") summary = msg.summary ?? null;
          else if (msg.type === "error") throw new Error(msg.message);
        }
      }
      if (!summary) throw new Error("The import ended unexpectedly. Nothing was added.");
      setStage({ name: "done", summary });
      toast.success("Import completed");
      refresh();
    } catch (e) {
      setError(errorMessage(e));
      setStage({ name: "idle" });
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      {error && <Alert variant="destructive"><TriangleAlert /><div>{error}</div></Alert>}
      {stage.name === "idle" && <ImportDropzone onFile={onFile} />}
      {stage.name === "parsing" && (
        <div className="space-y-3 rounded-xl border bg-card p-6" aria-busy="true" role="status">
          <p className="text-sm font-medium">Reading {stage.fileName}…</p>
          <Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" />
        </div>
      )}
      {stage.name === "preview" && (
        <ImportPreview preview={stage.preview} fileName={stage.fileName} onCancel={() => setStage({ name: "idle" })}
          onConfirm={(c) => runImport(stage.html, c, stage.preview.stats.bookmarkCount - (c.skipDuplicates ? stage.preview.stats.duplicateCount : 0))} />
      )}
      {stage.name === "importing" && <ImportProgress done={stage.done} total={stage.total} />}
      {stage.name === "done" && <ImportDone summary={stage.summary} onAnother={() => setStage({ name: "idle" })} />}
    </div>
  );
}
