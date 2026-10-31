"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setActiveBusinessAction } from "@/modules/businesses";
import { cn } from "@/lib/cn";

export type SwitcherBusiness = {
  id: string;
  name: string;
  category?: string | null;
};

export function BusinessSwitcher({
  businesses,
  activeId,
  email,
}: {
  businesses: SwitcherBusiness[];
  activeId: string | null;
  email: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const active = businesses.find((b) => b.id === activeId) ?? businesses[0] ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onSelect(id: string) {
    if (id === active?.id) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      await setActiveBusinessAction(id);
      if (pathname.startsWith("/dashboard/business/")) {
        router.push(`/dashboard/business/${id}`);
      } else {
        router.refresh();
      }
    });
  }

  if (businesses.length === 0) {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">No business yet</p>
        <p className="truncate text-xs text-muted-foreground md:hidden">{email}</p>
      </div>
    );
  }

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        aria-label="Select business"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={pending}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex max-w-[14rem] sm:max-w-xs items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
          open && "bg-muted/80",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {active?.name ?? "Select business"}
          </p>
          <p className="truncate text-xs text-muted-foreground md:hidden">{email}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Businesses"
          className="absolute left-0 mt-2 w-64 rounded-2xl border border-border bg-card p-1.5 shadow-pop z-30"
        >
          <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            Businesses ({businesses.length})
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {businesses.map((biz) => {
              const isSelected = biz.id === active?.id;
              return (
                <button
                  key={biz.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelect(biz.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-brand-50 font-medium text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{biz.name}</p>
                    {biz.category ? (
                      <p className="truncate text-xs text-muted-foreground">{biz.category}</p>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/dashboard/business"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-brand hover:bg-muted transition-colors font-medium"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              Add another business
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
