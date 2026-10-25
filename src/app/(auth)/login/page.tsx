import { LoginForm } from "./login-form";

export const instant = false;

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Owner sign in</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Use email magic link or password. Customers never create accounts.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
