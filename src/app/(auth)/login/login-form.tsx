"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "magic" | "password";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (otpError) {
          throw otpError;
        }
        setMessage("Check your email for the magic link.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // First-time owners can create a password account.
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) {
          throw signInError;
        }
        setMessage(
          "Account created. If email confirmation is required, check your inbox; otherwise refresh and open the dashboard.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={mode === "magic" ? "font-semibold underline" : "opacity-70"}
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
        <button
          type="button"
          className={
            mode === "password" ? "font-semibold underline" : "opacity-70"
          }
          onClick={() => setMode("password")}
        >
          Password
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>

      {mode === "password" ? (
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Working…" : mode === "magic" ? "Send magic link" : "Continue"}
      </button>

      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
