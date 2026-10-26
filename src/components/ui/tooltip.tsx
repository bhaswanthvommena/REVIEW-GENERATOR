"use client";

import { useId, useState } from "react";

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-[calc(100%+0.4rem)] left-1/2 z-30 -translate-x-1/2 rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-pop"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
