"use client";
import { Bookmark, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/client/api";

export function AuthForm({ allowRegistration, demoHint }: { allowRegistration: boolean; demoHint: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: mode === "login" ? { email, password } : { name, email, password } });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Bookmark className="size-5" /></span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your vault"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your saved links, organized your way.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
        {mode === "register" && (
          <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        )}
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "register" && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "login" ? "Sign in" : "Create account"}</Button>
      </form>
      {allowRegistration && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      )}
      {demoHint && <p className="text-center text-xs text-muted-foreground">Demo: demo@bookmarkvault.dev / demo1234</p>}
    </div>
  );
}
