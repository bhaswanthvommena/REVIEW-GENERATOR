"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    initial?.googleReviewUrl ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Request failed");
      }
      router.push(`/dashboard/business/${body.business!.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Slug (optional)
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="cafe-luna"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Category (optional)
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Google review URL
        <input
          required
          type="url"
          value={googleReviewUrl}
          onChange={(e) => setGoogleReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…/review"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : businessId ? "Update business" : "Create business"}
      </button>
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
