import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16 6.2 18.4 11l5.3.8-3.8 3.7.9 5.3L16 18.3l-4.8 2.5.9-5.3L8.3 11.8 13.6 11 16 6.2z"
          />
        </svg>
      </span>
      {compact ? <span className="sr-only">Review Generator</span> : "Review Generator"}
    </Link>
  );
}
