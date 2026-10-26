"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  businessId?: string;
  initial?: {
    name: string;
    slug: string | null;
    category: string | null;
    description: string | null;
    googleReviewUrl: string;
  };
};

export function BusinessForm({ businessId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [googleReviewUrl, setGoogleReviewUrl] = useState(initial?.googleReviewUrl ?? "");
  const [showDetails, setShowDetails] = useState(Boolean(initial?.slug || initial?.description));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canTest = googleReviewUrl.trim().startsWith("https://");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      name,
      slug: slug.trim() ? slug.trim() : null,
      category: category.trim() ? category.trim() : null,
      description: description.trim() ? description.trim() : null,
      googleReviewUrl,
    };

    try {
      const response = await fetch(
        businessId ? `/api/v1/businesses/${businessId}` : "/api/v1/businesses",
        {
          method: businessId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as {
        business?: { id: string };
        error?: { message: string };
      };
      if (!response.ok || !body.business) {
        throw new Error(body.error?.message ?? "Request failed");
      }
      router.push(`/dashboard/business/${body.business.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>The name customers see on the feedback page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Business name" htmlFor="business-name">
            <Input
              id="business-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Category" htmlFor="business-category" hint="Cafe, salon, clinic">
            <Input
              id="business-category"
              value={category}
              placeholder="Cafe, salon, clinic"
              aria-describedby="business-category-hint"
              onChange={(event) => setCategory(event.target.value)}
            />
          </Field>
          <button
            type="button"
            className="self-start text-sm font-medium text-brand underline-offset-4 hover:underline"
            onClick={() => setShowDetails((open) => !open)}
          >
            {showDetails ? "Hide details" : "More details"}
          </button>
          {showDetails ? (
            <>
              <Field label="Slug" htmlFor="business-slug" hint="Lowercase words separated by hyphens.">
                <Input
                  id="business-slug"
                  value={slug}
                  placeholder="cafe-luna"
                  aria-describedby="business-slug-hint"
                  onChange={(event) => setSlug(event.target.value)}
                />
              </Field>
              <Field label="Description" htmlFor="business-description">
                <Textarea
                  id="business-description"
                  value={description}
                  rows={3}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google review link</CardTitle>
          <CardDescription>
            Paste the official link from your Google Business Profile. https only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Google review URL" htmlFor="google-review-url">
            <Input
              id="google-review-url"
              required
              type="url"
              inputMode="url"
              value={googleReviewUrl}
              placeholder="https://g.page/r/…/review"
              onChange={(event) => setGoogleReviewUrl(event.target.value)}
            />
          </Field>
          {canTest ? (
            <a
              href={googleReviewUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              Test link
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Paste an https link to open it and confirm it is the right page.
            </p>
          )}
        </CardContent>
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" size="lg" loading={pending} className="sm:w-auto">
        {businessId ? "Save changes" : "Create business"}
      </Button>
    </form>
  );
}
