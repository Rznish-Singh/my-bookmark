"use client";
import { FileText } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!/\.html?$/i.test(file.name)) return "That doesn't look like a bookmarks file. Choose the .html file exported from your browser.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return "That file is larger than 10 MB. Try exporting fewer bookmarks at a time.";
  return null;
}

export function ImportDropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = (files: FileList | null) => { const f = files?.[0]; if (f) onFile(f); };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) pick(e.dataTransfer.files); }}
      className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors", over ? "border-primary bg-accent" : "border-input bg-card", disabled && "opacity-60")}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-6" /></span>
      <p className="text-base font-medium">Drop bookmarks.html here</p>
      <p className="mt-1 text-sm text-muted-foreground">
        or{" "}
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">browse your computer</button>
      </p>
      <input ref={input} type="file" accept=".html,.htm,text/html" className="sr-only" tabIndex={-1} aria-label="Choose bookmarks HTML file" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <p className="mt-5 text-xs text-muted-foreground">Supported: Chrome, Firefox, Edge, Safari-compatible bookmark HTML · up to 10 MB</p>
    </div>
  );
}
