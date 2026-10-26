"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/browser";
import { safeInternalPath } from "@/lib/url";

type Mode = "magic" | "signin" | "signup";

const tabs = [
  { id: "signup", label: "Sign up" },
  { id: "signin", label: "Sign in" },
  { id: "magic", label: "Magic link" },
];

function isMode(value: string): value is Mode {
  return value === "signup" || value === "signin" || value === "magic";
}

export function LoginForm({
  nextPath,
  authError,
  initialMode = "signup",
}: {
  nextPath: string;
  authError: boolean;
  initialMode?: string;
}) {
  const router = useRouter();
  const destination = safeInternalPath(nextPath);
  const [mode, setMode] = useState<Mode>(isMode(initialMode) ? initialMode : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError ? "That sign-in link did not work. Request a new one and try again." : null,
  );
  const [pending, setPending] = useState(false);

  function selectMode(next: string) {
    if (!isMode(next)) return;
    setMode(next);
    setMessage(null);
    setError(null);
    setFieldErrors({});
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email.";
    }
    if (mode !== "magic" && password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;

      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });
        if (otpError) throw otpError;
        setMessage("We sent a sign-in link. Open it on this device to reach your dashboard.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push(destination);
          router.refresh();
          return;
        }
        setMessage("Account created. Open the confirmation email, then come back and sign in.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Tabs tabs={tabs} value={mode} onChange={selectMode} label="Account mode" />
      <TabPanel id={mode} active>
        <div className="flex flex-col gap-4 pt-5">
          <Field
            label="Email"
            htmlFor="email"
            error={fieldErrors.email}
            hint="Customers never create an account."
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "email-error" : "email-hint"}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          {mode === "magic" ? null : (
            <Field
              label="Password"
              htmlFor="password"
              error={fieldErrors.password}
              hint="At least 8 characters."
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
                  className="pr-12"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          )}

          <Button type="submit" size="lg" loading={pending}>
            {mode === "signup"
              ? "Create account"
              : mode === "signin"
                ? "Sign in"
                : "Send magic link"}
          </Button>
        </div>
      </TabPanel>

      {message ? (
        <Alert tone="success" title="Check your email">
          <p>{message}</p>
          {mode !== "signin" ? (
            <button
              type="button"
              className="mt-2 text-sm font-medium underline"
              onClick={() => selectMode("signin")}
            >
              I confirmed — sign in
            </button>
          ) : null}
        </Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </form>
  );
}


/** Supabase messages that are safe and useful to show. Everything else is generic. */
function authMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/already registered/i.test(message)) return "An account with this email already exists. Try signing in.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first, then sign in.";
  if (/password should be at least/i.test(message)) return "Use a longer password.";
  return "Something went wrong, please try again.";
}
