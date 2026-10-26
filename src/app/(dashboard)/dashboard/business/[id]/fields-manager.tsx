"use client";

import { GripVertical } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { FeedbackField, FieldInputType } from "@/modules/fields";

type Props = {
  businessId: string;
  initial: FeedbackField[];
};

type FieldPatch = Partial<{
  label: string;
  inputType: FieldInputType;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}>;

const selectClass =
  "min-h-12 rounded-xl border border-border bg-card px-3 text-base text-foreground shadow-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function FieldsManager({ businessId, initial }: Props) {
  const { push } = useToast();
  const [fields, setFields] = useState(initial);
  const [label, setLabel] = useState("");
  const [newType, setNewType] = useState<FieldInputType>("short");
  const [newRequired, setNewRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FeedbackField | null>(null);

  async function refresh() {
    const response = await fetch(`/api/v1/businesses/${businessId}/fields`);
    if (!response.ok) return;
    const body = (await response.json()) as { fields?: FeedbackField[] };
    if (body.fields) {
      setFields(body.fields);
    }
  }

  async function patchField(fieldId: string, patch: FieldPatch): Promise<boolean> {
    setError(null);
    const response = await fetch(`/api/v1/fields/${fieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, patch }),
    });
    if (!response.ok) {
      setError(await readError(response, "Update failed"));
      return false;
    }
    await refresh();
    return true;
  }

  async function reorder(next: FeedbackField[]) {
    const previous = fields;
    setFields(next.map((field, index) => ({ ...field, display_order: index + 1 })));
    const results = await Promise.all(
      next.map((field, index) =>
        fetch(`/api/v1/fields/${field.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, patch: { displayOrder: index + 1 } }),
        }),
      ),
    );
    if (results.some((response) => !response.ok)) {
      setFields(previous);
      setError("Could not save the new order");
    }
  }

  function move(fieldId: string, direction: -1 | 1) {
    const index = fields.findIndex((field) => field.id === fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    void reorder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...fields];
    const from = next.findIndex((field) => field.id === dragId);
    const to = next.findIndex((field) => field.id === targetId);
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
      const response = await fetch(`/api/v1/businesses/${businessId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          inputType: newType,
          isRequired: newRequired,
          displayOrder: fields.length + 1,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Create failed"));
      }
      setLabel("");
      setNewType("short");
      setNewRequired(false);
      await refresh();
      push("Field added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  function startRename(field: FeedbackField) {
    setEditingId(field.id);
    setEditLabel(field.label);
    setError(null);
  }

  async function saveRename(field: FeedbackField) {
    const next = editLabel.trim();
    if (!next || next === field.label) {
      setEditingId(null);
      return;
    }
    if (await patchField(field.id, { label: next })) {
      setEditingId(null);
      push("Field renamed");
    }
  }

  async function onDelete(field: FeedbackField) {
    setError(null);
    const response = await fetch(`/api/v1/fields/${field.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (!response.ok) {
      throw new Error(await readError(response, "Delete failed"));
    }
    await refresh();
    push("Field deleted");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer fields</CardTitle>
        <CardDescription>
          Text boxes customers fill in next to the star questions, such as car make and model.
          Everything they type is sent to the AI so each draft uses their own details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No fields yet. Customers will only rate with stars.
          </p>
        ) : (
          <ul className="space-y-2">
            {fields.map((field, index) => {
              const editing = editingId === field.id;
              return (
                <li
                  key={field.id}
                  draggable={!editing}
                  onDragStart={() => setDragId(field.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(field.id)}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3 py-2",
                    !field.is_active && "opacity-70",
                  )}
                >
                  <span className="text-muted-foreground" aria-hidden="true">
                    <GripVertical className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveRename(field);
                        }}
                      >
                        <Input
                          aria-label={`New name for ${field.label}`}
                          value={editLabel}
                          maxLength={80}
                          autoFocus
                          className="min-h-10 flex-1"
                          onChange={(event) => setEditLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="font-medium">{field.label}</span>
                        <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                          <Badge tone="muted">{field.input_type === "long" ? "Long text" : "Short text"}</Badge>
                          <Badge tone={field.is_required ? "warning" : "muted"}>
                            {field.is_required ? "Required" : "Optional"}
                          </Badge>
                          {!field.is_active ? <Badge tone="muted">Hidden</Badge> : null}
                        </span>
                      </>
                    )}
                  </div>
                  {editing ? null : (
                    <>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${field.label} up`}
                          disabled={index === 0}
                          onClick={() => move(field.id, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Move ${field.label} down`}
                          disabled={index === fields.length - 1}
                          onClick={() => move(field.id, 1)}
                        >
                          Down
                        </Button>
                      </div>
                      <select
                        aria-label={`Input size for ${field.label}`}
                        value={field.input_type}
                        className={cn(selectClass, "min-h-10 py-1 text-sm")}
                        onChange={(event) =>
                          void patchField(field.id, { inputType: event.target.value as FieldInputType })
                        }
                      >
                        <option value="short">Short text</option>
                        <option value="long">Long text</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={field.is_required}
                          label={`${field.is_required ? "Make optional" : "Make required"}: ${field.label}`}
                          onCheckedChange={(next) => void patchField(field.id, { isRequired: next })}
                        />
                        <span aria-hidden="true">Required</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={field.is_active}
                          label={`${field.is_active ? "Hide" : "Show"} ${field.label}`}
                          onCheckedChange={(next) => void patchField(field.id, { isActive: next })}
                        />
                        <span aria-hidden="true">Shown</span>
                      </label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => startRename(field)}>
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => setPendingDelete(field)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form
          onSubmit={onCreate}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        >
          <Field label="New field" htmlFor="field-label" hint="For example: Car make and model">
            <Input
              id="field-label"
              required
              maxLength={80}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field label="Size" htmlFor="field-type">
            <select
              id="field-type"
              value={newType}
              className={selectClass}
              onChange={(event) => setNewType(event.target.value as FieldInputType)}
            >
              <option value="short">Short text</option>
              <option value="long">Long text</option>
            </select>
          </Field>
          <div className="flex min-h-12 items-center gap-2 text-sm">
            <Switch
              checked={newRequired}
              label={newRequired ? "New field is required" : "New field is optional"}
              onCheckedChange={setNewRequired}
            />
            <span aria-hidden="true">Required</span>
          </div>
          <Button type="submit" loading={pending} className="sm:w-auto">
            Add
          </Button>
        </form>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </CardContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this field?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will disappear from new feedback. Answers customers already gave stay in your records.`
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
