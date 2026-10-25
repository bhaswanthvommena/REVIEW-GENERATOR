"use client";

import { useState, type FormEvent } from "react";
import type { RatingAttribute } from "@/modules/attributes";

type Props = {
  businessId: string;
  initial: RatingAttribute[];
};

export function AttributesManager({ businessId, initial }: Props) {
  const [attributes, setAttributes] = useState(initial);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/v1/businesses/${businessId}/attributes`);
    const body = (await response.json()) as { attributes?: RatingAttribute[] };
    if (response.ok && body.attributes) {
      setAttributes(body.attributes);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/businesses/${businessId}/attributes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            displayOrder: attributes.length + 1,
          }),
        },
      );
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Create failed");
      }
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(attribute: RatingAttribute) {
    setError(null);
    const response = await fetch(`/api/v1/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        isActive: !attribute.is_active,
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message: string } };
      setError(body.error?.message ?? "Update failed");
      return;
    }
    await refresh();
  }

  async function onDelete(attribute: RatingAttribute) {
    setError(null);
    const response = await fetch(`/api/v1/attributes/${attribute.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message: string } };
      setError(body.error?.message ?? "Delete failed");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Rating attributes</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Defaults are seeded on business create (Overall experience, Quality,
        Service, Value, Atmosphere). Customers rate each active attribute 1–5.
      </p>

      <ul className="space-y-2">
        {attributes.map((attribute) => (
          <li
            key={attribute.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 py-2 text-sm dark:border-zinc-800"
          >
            <span>
              <span className="font-medium">{attribute.label}</span>
              <span className="ml-2 text-zinc-500">
                order {attribute.display_order}
                {!attribute.is_active ? " · inactive" : ""}
              </span>
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                className="underline"
                onClick={() => toggleActive(attribute)}
              >
                {attribute.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                className="underline text-red-700 dark:text-red-400"
                onClick={() => onDelete(attribute)}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          New attribute label
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add
        </button>
      </form>
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
