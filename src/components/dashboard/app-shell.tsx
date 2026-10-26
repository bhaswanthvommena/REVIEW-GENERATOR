"use client";

import {
  BarChart3,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

const nav = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    match: "exact" as const,
  },
  {
    href: "/dashboard/business",
    label: "Business",
    icon: Store,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/qr",
    label: "QR codes",
    icon: QrCode,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    match: "prefix" as const,
  },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  setupHref,
  email,
  businessName,
}: {
  children: React.ReactNode;
  setupHref: string;
  email: string;
  businessName: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [accountOpen]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background md:grid md:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-border bg-card md:flex",
          collapsed ? "w-[4.5rem]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center px-3", collapsed ? "justify-center" : "px-4")}>
          <Logo href="/dashboard" compact={collapsed} />
        </div>
        <nav aria-label="Owner" className="flex flex-1 flex-col gap-1 px-2">
          {nav.map((item) => {
            const href = item.label === "Business" ? setupHref : item.href;
            const active = isActive(pathname, item.href, item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
                  active
                    ? "bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), collapsed ? "mx-auto" : "ml-auto")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-h-full min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-ml-2 md:hidden")}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {businessName ?? "No business yet"}
              </p>
              <p className="truncate text-xs text-muted-foreground md:hidden">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className={buttonVariants({ variant: "outline", size: "sm" })}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((current) => !current)}
              >
                Account
              </button>
              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-pop"
                >
                  <p className="px-2 py-1.5 text-xs break-all text-muted-foreground">{email}</p>
                  <Link
                    href="/dashboard/settings"
                    role="menuitem"
                    className="flex min-h-11 items-center rounded-lg px-2 text-sm hover:bg-muted"
                    onClick={() => setAccountOpen(false)}
                  >
                    Settings
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 pb-10 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            aria-label="Owner"
            role="dialog"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-pop"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Logo href="/dashboard" />
              <button
                type="button"
                className={buttonVariants({ variant: "ghost", size: "icon" })}
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="flex flex-1 flex-col gap-1 px-2">
              {nav.map((item) => {
                const href = item.label === "Business" ? setupHref : item.href;
                const active = isActive(pathname, item.href, item.match);
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base",
                        active
                          ? "bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
