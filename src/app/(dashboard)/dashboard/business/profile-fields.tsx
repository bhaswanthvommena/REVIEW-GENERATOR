"use client";

import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ProfileValues = {
  name: string;
  category: string;
  location: string;
  description: string;
  googleReviewUrl: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

/** Returns an error per empty required field, or an empty object. */
export function validateProfile(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!values.name.trim()) errors.name = "Business name is required";
  if (!values.category.trim()) errors.category = "Category is required";
  if (!values.location.trim()) errors.location = "Location is required";
  if (!values.googleReviewUrl.trim().startsWith("https://")) {
    errors.googleReviewUrl = "Paste an https Google review link";
  }
  return errors;
}

export function ProfileFields({
  values,
  errors,
  onChange,
}: {
  values: ProfileValues;
  errors?: ProfileErrors;
  onChange: (patch: Partial<ProfileValues>) => void;
}) {
  const canTest = values.googleReviewUrl.trim().startsWith("https://");

  return (
    <div className="space-y-4">
      <Field label="Business name" htmlFor="business-name" required error={errors?.name}>
        <Input
          id="business-name"
          required
          maxLength={120}
          value={values.name}
          aria-invalid={Boolean(errors?.name)}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Category"
          htmlFor="business-category"
          required
          error={errors?.category}
          hint="Cafe, salon, auto accessories"
        >
          <Input
            id="business-category"
            required
            maxLength={80}
            value={values.category}
            aria-invalid={Boolean(errors?.category)}
            onChange={(event) => onChange({ category: event.target.value })}
          />
        </Field>
        <Field
          label="Location"
          htmlFor="business-location"
          required
          error={errors?.location}
          hint="City or area, such as Nellore"
        >
          <Input
            id="business-location"
            required
            maxLength={120}
            value={values.location}
            aria-invalid={Boolean(errors?.location)}
            onChange={(event) => onChange({ location: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="business-description" hint="Optional. For your own notes.">
        <Textarea
          id="business-description"
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </Field>
      <Field
        label="Google review link"
        htmlFor="google-review-url"
        required
        error={errors?.googleReviewUrl}
        hint="Paste the official link from your Google Business Profile. https only."
      >
        <Input
          id="google-review-url"
          required
          type="url"
          inputMode="url"
          value={values.googleReviewUrl}
          placeholder="https://g.page/r/…/review"
          aria-invalid={Boolean(errors?.googleReviewUrl)}
          onChange={(event) => onChange({ googleReviewUrl: event.target.value })}
        />
      </Field>
      {canTest ? (
        <a
          href={values.googleReviewUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Test link
        </a>
      ) : null}
    </div>
  );
}
