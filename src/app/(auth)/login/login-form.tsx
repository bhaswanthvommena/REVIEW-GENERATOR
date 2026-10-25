"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "magic" | "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function selectMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setError(null);
  }

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
        setMessage(
          "We sent a sign-in link. Open it on this phone, then you’ll land in the dashboard.",
        );
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) {
          throw signUpError;
        }
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
        setMessage(
          "Account created. Open the confirmation email, then come back and sign in.",
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
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
          className={mode === "signup" ? "font-semibold underline" : "opacity-70"}
          onClick={() => selectMode("signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          className={mode === "signin" ? "font-semibold underline" : "opacity-70"}
          onClick={() => selectMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "magic" ? "font-semibold underline" : "opacity-70"}
          onClick={() => selectMode("magic")}
        >
          Magic link
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-xl border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700"
        />
      </label>

      {mode === "magic" ? null : (
        <label className="flex flex-col gap-1.5 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-zinc-900 px-4 text-base font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending
          ? "Working…"
          : mode === "signup"
            ? "Create account"
            : mode === "signin"
              ? "Sign in"
              : "Send magic link"}
      </button>

      {message ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-base font-medium">Check your email</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
          {mode !== "signin" ? (
            <button
              type="button"
              className="text-sm font-medium underline"
              onClick={() => selectMode("signin")}
            >
              I confirmed — sign in
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
