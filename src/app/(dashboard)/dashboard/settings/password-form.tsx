"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { toUserMessage } from "@/lib/api/client";

export function PasswordForm({ email }: { email: string }) {
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [otpConfirm, setOtpConfirm] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpPending, setOtpPending] = useState(false);

  async function onChange(event: FormEvent) {
    event.preventDefault();
    if (nextPassword.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      push("Password updated");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function sendCode() {
    setOtpPending(true);
    setOtpError(null);
    try {
      const supabase = createClient();
      const { error: otpSendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpSendError) throw otpSendError;
      setCodeSent(true);
    } catch (err) {
      setOtpError(toUserMessage(err));
    } finally {
      setOtpPending(false);
    }
  }

  async function onOtp(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) {
      setOtpError("Enter the code from the email.");
      return;
    }
    if (otpPassword.length < 8) {
      setOtpError("Use at least 8 characters.");
      return;
    }
    if (otpPassword !== otpConfirm) {
      setOtpError("Passwords do not match.");
      return;
    }
    setOtpPending(true);
    setOtpError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (verifyError) {
        setOtpError("That code is incorrect or expired. Send a new one.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: otpPassword });
      if (updateError) throw updateError;
      setCode("");
      setOtpPassword("");
      setOtpConfirm("");
      setCodeSent(false);
      setOtpOpen(false);
      push("Password updated");
    } catch (err) {
      setOtpError(toUserMessage(err));
    } finally {
      setOtpPending(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div>
        <h3 className="text-sm font-medium">Change password</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enter your current password, then a new one.</p>
      </div>
      <form onSubmit={onChange} noValidate className="space-y-4">
        <Field label="Current password" htmlFor="current-password" required>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="new-password" required hint="At least 8 characters.">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-new-password" required>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" loading={pending}>
          Update password
        </Button>
      </form>

      <button
        type="button"
        className="text-sm font-medium text-brand underline-offset-4 hover:underline"
        onClick={() => setOtpOpen((open) => !open)}
      >
        I don&apos;t remember my password
      </button>

      {otpOpen ? (
        <form onSubmit={onOtp} noValidate className="space-y-4 rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">
            We can email a code to {email}. Enter it here with a new password.
          </p>
          <Button type="button" variant="outline" onClick={() => void sendCode()} loading={otpPending && !codeSent}>
            {codeSent ? "Send a new code" : "Email me a code"}
          </Button>
          {codeSent ? (
            <>
              <Field label="Email code" htmlFor="password-otp" required>
                <Input
                  id="password-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </Field>
              <Field label="New password" htmlFor="otp-password" required>
                <Input
                  id="otp-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={otpPassword}
                  onChange={(event) => setOtpPassword(event.target.value)}
                />
              </Field>
              <Field label="Confirm new password" htmlFor="otp-confirm" required>
                <Input
                  id="otp-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={otpConfirm}
                  onChange={(event) => setOtpConfirm(event.target.value)}
                />
              </Field>
              <Button type="submit" loading={otpPending}>
                Set new password
              </Button>
            </>
          ) : null}
          {otpError ? <Alert tone="danger">{otpError}</Alert> : null}
        </form>
      ) : null}
    </div>
  );
}
