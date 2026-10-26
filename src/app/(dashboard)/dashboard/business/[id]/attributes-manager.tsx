"use client";

import { GripVertical } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { RatingAttribute } from "@/modules/attributes";

type Props = {
  businessId: string;
  initial: RatingAttribute[];
};

export function AttributesManager({ businessId, initial }: Props) {
  const { push } = useToast();
  const [attributes, setAttributes] = useState(initial);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RatingAttribute | null>(null);

  async function refresh() {
    const response = await fetch(`/api/v1/businesses/${businessId}/attributes`);
    const body = (await response.json()) as { attributes?: RatingAttribute[] };
    if (response.ok && body.attributes) {
      setAttributes(body.attributes);
    }
  }

  async function persistOrder(list: RatingAttribute[]) {
    const results = await Promise.all(
      list.map((attribute, index) =>
        fetch(`/api/v1/attributes/${attribute.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            displayOrder: index + 1,
          }),
        }),
      ),
    );
    if (results.some((response) => !response.ok)) {
      throw new Error("Could not save the new order");
    }
  }

  async function reorder(next: RatingAttribute[]) {
    const previous = attributes;
    setAttributes(next.map((attribute, index) => ({ ...attribute, display_order: index + 1 })));
    try {
      await persistOrder(next);
    } catch (err) {
      setAttributes(previous);
      setError(err instanceof Error ? err.message : "Could not save the new order");
    }
  }

  function move(attributeId: string, direction: -1 | 1) {
    const index = attributes.findIndex((attribute) => attribute.id === attributeId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= attributes.length) return;
    const next = [...attributes];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    void reorder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...attributes];
    const from = next.findIndex((attribute) => attribute.id === dragId);
    const to = next.findIndex((attribute) => attribute.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setDragId(null);
    void reorder(next);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          displayOrder: attributes.length + 1,
        }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Create failed");
      }
      setLabel("");
      await refresh();
      push("Question added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(attribute: RatingAttribute, isActive: boolean) {
    setError(null);
    const response = await fetch(`/api/v1/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, isActive }),
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
      throw new Error(body.error?.message ?? "Delete failed");
    }
    await refresh();
    push("Question deleted");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating questions</CardTitle>
        <CardDescription>
          Customers rate each active question from 1 to 5. Nothing is selected for them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {attributes.map((attribute, index) => (
            <li
              key={attribute.id}
              draggable
              onDragStart={() => setDragId(attribute.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(attribute.id)}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <span className="text-muted-foreground" aria-hidden="true">
                <GripVertical className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{attribute.label}</span>
                {!attribute.is_active ? (
                  <span className="ml-2 text-sm text-muted-foreground">Inactive</span>
                ) : null}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Move ${attribute.label} up`}
                  disabled={index === 0}
                  onClick={() => move(attribute.id, -1)}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Move ${attribute.label} down`}
                  disabled={index === attributes.length - 1}
                  onClick={() => move(attribute.id, 1)}
                >
                  Down
                </Button>
              </div>
              <Switch
                checked={attribute.is_active}
                label={`${attribute.is_active ? "Deactivate" : "Activate"} ${attribute.label}`}
                onCheckedChange={(next) => void toggleActive(attribute, next)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger"
                onClick={() => setPendingDelete(attribute)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>

        <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="New question" htmlFor="attribute-label" className="flex-1">
            <Input
              id="attribute-label"
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Button type="submit" loading={pending} className="sm:w-auto">
            Add
          </Button>
        </form>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </CardContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this question?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will disappear from new feedback. Past ratings stay in your records.`
            : ""
        }
        confirmLabel="Delete"
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await onDelete(pendingDelete);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
          }
        }}
      />
    </Card>
  );
}
