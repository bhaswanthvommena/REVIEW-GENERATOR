"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Guard = {
  save: () => Promise<boolean>;
  discard: () => void;
};

const UnsavedChangesContext = createContext<{
  setGuard: (guard: Guard | null) => void;
} | null>(null);

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider");
  }
  return context;
}

/** Asks to save or discard when a link is clicked while a form is dirty. */
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const guardRef = useRef<Guard | null>(null);
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setGuard = useCallback((guard: Guard | null) => {
    guardRef.current = guard;
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!guardRef.current || open) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = anchor.getAttribute("href");
      if (!url || url.startsWith("#") || /^https?:/i.test(url) || url.startsWith("mailto:")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setHref(url);
      setOpen(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open]);

  function leave() {
    const next = href;
    guardRef.current = null;
    setOpen(false);
    setHref(null);
    if (next) router.push(next);
  }

  async function onSave() {
    const guard = guardRef.current;
    if (!guard) return;
    setPending(true);
    const ok = await guard.save();
    setPending(false);
    if (!ok) {
      setOpen(false);
      return;
    }
    leave();
  }

  function onDiscard() {
    guardRef.current?.discard();
    leave();
  }

  return (
    <UnsavedChangesContext.Provider value={{ setGuard }}>
      {children}
      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title="Save your changes?"
        description="You have edits that are not saved yet."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDiscard} disabled={pending}>
            Discard
          </Button>
          <Button type="button" onClick={() => void onSave()} loading={pending}>
            Save
          </Button>
        </div>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}
