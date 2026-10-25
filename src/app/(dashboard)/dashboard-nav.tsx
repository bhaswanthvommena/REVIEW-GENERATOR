"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", match: "exact" as const },
  { href: "/dashboard/business", label: "Setup", match: "prefix" as const },
  { href: "/dashboard/qr", label: "QR", match: "prefix" as const },
  { href: "/dashboard/analytics", label: "Analytics", match: "prefix" as const },
];

export function DashboardNav({ setupHref }: { setupHref: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Owner"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-background pb-[env(safe-area-inset-bottom)] dark:border-zinc-800"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {items.map((item) => {
          const href = item.label === "Setup" ? setupHref : item.href;
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center text-sm ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-zinc-500"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
