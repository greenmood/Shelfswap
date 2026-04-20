"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Shelf<span className="italic text-accent">swap</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in with a magic link.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-md border border-subtle bg-paper p-4 text-sm dark:border-neutral-800">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-muted">
              We sent a link to <span className="font-mono">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-subtle px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-700 dark:bg-ink"
              disabled={status === "sending"}
            />
            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
