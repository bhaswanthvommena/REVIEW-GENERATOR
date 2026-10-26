"use client";

import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  ProfileFields,
  validateProfile,
  type ProfileErrors,
  type ProfileValues,
} from "../profile-fields";

type Item = {
  key: string;
  id: string | null;
  label: string;
  isRequired: boolean;
  isActive: boolean;
};

export type SetupInitial = {
  profile: ProfileValues;
  fields: Array<{ id: string; label: string; isRequired: boolean; isActive: boolean }>;
  attributes: Array<{ id: string; label: string; isActive: boolean }>;
};

type Draft = {
  profile: ProfileValues;
  fields: Item[];
  attributes: Item[];
};

function toDraft(initial: SetupInitial): Draft {
  return {
    profile: initial.profile,
    fields: initial.fields.map((item) => ({ ...item, key: item.id })),
    attributes: initial.attributes.map((item) => ({
      ...item,
      key: item.id,
      isRequired: false,
    })),
  };
}

function newItem(label: string): Item {
  return {
    key: crypto.randomUUID(),
    id: null,
    label,
    isRequired: false,
    isActive: true,
  };
}

function findDuplicates(items: Item[]): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    const name = item.label.trim().toLowerCase();
    if (!name) continue;
    const first = seen.get(name);
    if (first) {
      duplicates.add(first);
      duplicates.add(item.key);
    } else {
      seen.set(name, item.key);
    }
  }
  return duplicates;
}

const GENERIC_ERROR = "Something went wrong, please try again.";

export function BusinessSetup({
  businessId,
  initial,
}: {
  businessId: string;
  initial: SetupInitial;
}) {
  const router = useRouter();
  const { push } = useToast();
  const baseline = useMemo(() => toDraft(initial), [initial]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(baseline);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [badKeys, setBadKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function startEdit() {
    setDraft(baseline);
    setProfileErrors({});
    setBadKeys(new Set());
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(baseline);
    setProfileErrors({});
    setBadKeys(new Set());
    setError(null);
    setEditing(false);
  }

  async function save() {
    const problems = validateProfile(draft.profile);
    const bad = new Set<string>();
    for (const item of [...draft.fields, ...draft.attributes]) {
      if (!item.label.trim()) bad.add(item.key);
    }
    findDuplicates(draft.fields).forEach((key) => bad.add(key));
    findDuplicates(draft.attributes).forEach((key) => bad.add(key));

    setProfileErrors(problems);
    setBadKeys(bad);

    if (Object.keys(problems).length > 0) {
      setError("Fill in the required fields marked with *.");
      return;
    }
    if (bad.size > 0) {
      setError("Every field and question needs its own name.");
      return;
    }
    if (!draft.attributes.some((item) => item.isActive)) {
      setError("Keep at least one rating question shown.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/setup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.profile.name,
          category: draft.profile.category,
          location: draft.profile.location,
          description: draft.profile.description.trim() || null,
          googleReviewUrl: draft.profile.googleReviewUrl,
          fields: draft.fields.map((item) => ({
            id: item.id,
            label: item.label,
            isRequired: item.isRequired,
            isActive: item.isActive,
          })),
          attributes: draft.attributes.map((item) => ({
            id: item.id,
            label: item.label,
            isActive: item.isActive,
          })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        // Only short, safe messages for problems the owner can fix.
        setError(
          response.status === 400 || response.status === 409
            ? (body?.error?.message ?? GENERIC_ERROR)
            : GENERIC_ERROR,
        );
        return;
      }

      push("Saved");
      setEditing(false);
      router.refresh();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  const shown = editing ? draft : baseline;

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <p className="text-sm text-muted-foreground">
          {editing
            ? dirty
              ? "You have unsaved changes."
              : "Editing. Nothing is saved until you press Save."
            : "Review your setup, or press Edit to change it."}
        </p>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} loading={pending}>
                Save
              </Button>
            </>
          ) : (
            <Button type="button" onClick={startEdit}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              {editing ? (
                <>
                  Fields marked <span className="text-danger">*</span> are required.
                </>
              ) : (
                "What customers and the AI know about your business."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editing ? (
              <ProfileFields
                values={draft.profile}
                errors={profileErrors}
                onChange={(patch) =>
                  setDraft((current) => ({
                    ...current,
                    profile: { ...current.profile, ...patch },
                  }))
                }
              />
            ) : (
              <ProfileSummary profile={shown.profile} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ItemsCard
            title="Customer fields"
            description="Text boxes customers fill in next to the star questions, such as car make and model. Everything they type is sent to the AI so each draft uses their own details."
            emptyText="No fields yet. Customers will only rate with stars."
            addPlaceholder="New field, for example Accessories installed"
            showRequired
            editing={editing}
            items={shown.fields}
            badKeys={badKeys}
            onChange={(fields) => setDraft((current) => ({ ...current, fields }))}
          />
          <ItemsCard
            title="Rating questions"
            description="Customers rate each shown question from 1 to 5. Nothing is selected for them."
            emptyText="No questions yet."
            addPlaceholder="New question, for example Cleanliness"
            editing={editing}
            items={shown.attributes}
            badKeys={badKeys}
            onChange={(attributes) => setDraft((current) => ({ ...current, attributes }))}
          />
        </div>
      </div>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: ProfileValues }) {
  const rows: Array<[string, string]> = [
    ["Business name", profile.name],
    ["Category", profile.category],
    ["Location", profile.location],
    ["Description", profile.description],
    ["Google review link", profile.googleReviewUrl],
  ];
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">
            {value || <span className="font-normal text-muted-foreground">Not set</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function subscribePointer(onChange: () => void) {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on touch screens, where a tap should start editing a name. */
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

function ItemsCard({
  title,
  description,
  emptyText,
  addPlaceholder,
  showRequired = false,
  editing,
  items,
  badKeys,
  onChange,
}: {
  title: string;
  description: string;
  emptyText: string;
  addPlaceholder: string;
  showRequired?: boolean;
  editing: boolean;
  items: Item[];
  badKeys: Set<string>;
  onChange: (items: Item[]) => void;
}) {
  const coarse = useCoarsePointer();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  function patch(key: string, change: Partial<Item>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }

  function moveTo(key: string, target: number) {
    const from = items.findIndex((item) => item.key === key);
    if (from < 0 || target < 0 || target >= items.length || from === target) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange(next);
  }

  // Pointer events work for mouse, touch and pen, unlike HTML5 drag and drop.
  // Listening on window keeps the drag alive even if the row moves in the DOM.
  useEffect(() => {
    if (!dragKey) return;
    function onMove(event: PointerEvent) {
      const over = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-item-key]")?.dataset.itemKey;
      if (over && over !== dragKey) {
        const target = items.findIndex((item) => item.key === over);
        if (target >= 0) moveTo(dragKey as string, target);
      }
      if (event.clientY < 90) window.scrollBy(0, -14);
      else if (event.clientY > window.innerHeight - 90) window.scrollBy(0, 14);
    }
    function stop() {
      setDragKey(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    // moveTo closes over items, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragKey, items]);
  function onGripKey(event: React.KeyboardEvent, key: string, index: number) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(key, index - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(key, index + 1);
    }
  }

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    onChange([...items, newItem(label)]);
    setNewLabel("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {editing && items.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {coarse
              ? "Tap a name to rename it. Press and drag the handle to reorder."
              : "Double-click a name to rename it. Drag the handle to reorder."}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.key}
                data-item-key={item.key}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3 py-2",
                  !item.isActive && "opacity-70",
                  dragKey === item.key && "border-brand shadow-pop",
                )}
              >
                {editing ? (
                  <button
                    type="button"
                    aria-label={`Reorder ${item.label}. Use the up and down arrow keys.`}
                    className="-ml-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    onPointerDown={() => setDragKey(item.key)}
                    onKeyDown={(event) => onGripKey(event, item.key, index)}
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </button>
                ) : null}

                <div className="min-w-0 flex-1">
                  {editing ? (
                    <Input
                      aria-label={`Name: ${item.label || "new item"}`}
                      aria-invalid={badKeys.has(item.key)}
                      maxLength={80}
                      value={item.label}
                      readOnly={!coarse && renamingKey !== item.key}
                      title={coarse ? undefined : "Double-click to rename"}
                      className={cn(
                        "min-h-10 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-border focus-visible:border-border",
                        !coarse && renamingKey !== item.key && "cursor-text select-none",
                        badKeys.has(item.key) && "border-danger",
                      )}
                      onDoubleClick={() => setRenamingKey(item.key)}
                      onBlur={() => setRenamingKey(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === "Escape") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      onChange={(event) => patch(item.key, { label: event.target.value })}
                    />
                  ) : (
                    <span className="font-medium">{item.label}</span>
                  )}
                </div>

                {editing ? (
                  <>
                    {showRequired ? (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={item.isRequired}
                          label={`${item.isRequired ? "Make optional" : "Make required"}: ${item.label}`}
                          onCheckedChange={(next) => patch(item.key, { isRequired: next })}
                        />
                        <span aria-hidden="true">Required</span>
                      </label>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={item.isActive}
                        label={`${item.isActive ? "Hide" : "Show"} ${item.label}`}
                        onCheckedChange={(next) => patch(item.key, { isActive: next })}
                      />
                      <span aria-hidden="true">Shown</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => onChange(items.filter((entry) => entry.key !== item.key))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {showRequired && item.isRequired ? <Badge tone="warning">Required</Badge> : null}
                    {!item.isActive ? <Badge tone="muted">Hidden</Badge> : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {editing ? (
          <div className="flex gap-2">
            <Input
              aria-label={`Add to ${title}`}
              placeholder={addPlaceholder}
              maxLength={80}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={add} disabled={!newLabel.trim()}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

