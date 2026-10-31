"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setActiveBusinessAction } from "@/modules/businesses";
import {
  ProfileFields,
  validateProfile,
  type ProfileErrors,
  type ProfileValues,
} from "./profile-fields";

const EMPTY: ProfileValues = {
  name: "",
  category: "",
  location: "",
  description: "",
  googleReviewUrl: "",
};

/** First-time setup. Editing an existing business happens in BusinessSetup. */
export function BusinessForm() {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(EMPTY);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateProfile(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          category: values.category,
          location: values.location,
          description: values.description.trim() ? values.description.trim() : null,
          googleReviewUrl: values.googleReviewUrl,
        }),
      });
      const body = (await response.json()) as {
        business?: { id: string };
        error?: { message: string };
      };
      if (!response.ok || !body.business) {
        setError(
          response.status === 400
            ? (body.error?.message ?? "Check the details and try again.")
            : "Something went wrong, please try again.",
        );
        return;
      }
      await setActiveBusinessAction(body.business.id);
      router.push(`/dashboard/business/${body.business.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong, please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>
            Fields marked <span className="text-danger">*</span> are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileFields
            values={values}
            errors={errors}
            onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          />
        </CardContent>
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" size="lg" loading={pending} className="sm:w-auto">
        Create business
      </Button>
    </form>
  );
}
