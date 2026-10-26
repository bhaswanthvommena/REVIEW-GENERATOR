"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/login?mode=signin" className={buttonVariants({ variant: "ghost" })}>
            Sign in
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants()}>
            Get started
          </Link>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div id="mobile-nav" className="border-t border-border px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-11 rounded-xl px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/login?mode=signin" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in
            </Link>
            <Link href="/login?mode=signup" className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
