"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { toUserMessage, UserFacingError } from "@/lib/api/client";
import { dateOfBirthSchema, fullNameSchema, phoneSchema } from "@/modules/profile";

export function AccountForm({
  userId,
  email,
  initialName,
  initialPhone,
  initialDateOfBirth,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialPhone: string;
  initialDateOfBirth: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; dateOfBirth?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    const name = fullNameSchema.safeParse(fullName);
    if (!name.success) nextErrors.fullName = name.error.issues[0]?.message;
    const parsedPhone = phoneSchema.safeParse(phone);
    if (!parsedPhone.success) nextErrors.phone = parsedPhone.error.issues[0]?.message;
    const dob = dateOfBirthSchema.safeParse(dateOfBirth);
    if (!dob.success) nextErrors.dateOfBirth = dob.error.issues[0]?.message;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth || null,
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw new UserFacingError("Could not save your details.");
      push("Account saved");
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Name" htmlFor="account-name" required error={errors.fullName}>
        <Input
          id="account-name"
          autoComplete="name"
          maxLength={80}
          value={fullName}
          aria-invalid={errors.fullName ? true : undefined}
          onChange={(event) => setFullName(event.target.value)}
        />
      </Field>
      <Field label="Email" htmlFor="account-email" hint="Email cannot be changed.">
        <Input id="account-email" type="email" value={email} readOnly disabled />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number" htmlFor="account-phone" required error={errors.phone}>
          <Input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={phone}
            aria-invalid={errors.phone ? true : undefined}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label="Date of birth" htmlFor="account-dob" error={errors.dateOfBirth} hint="Optional.">
          <Input
            id="account-dob"
            type="date"
            autoComplete="bday"
            value={dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={errors.dateOfBirth ? true : undefined}
            onChange={(event) => setDateOfBirth(event.target.value)}
          />
        </Field>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" loading={pending}>
        Save details
      </Button>
    </form>
  );
}
