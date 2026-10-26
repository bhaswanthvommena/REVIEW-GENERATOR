import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That link does not match anything in Ventry.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-brand underline-offset-4 hover:underline"
      >
        Back home
      </Link>
    </main>
  );
}
