import { BusinessForm } from "./business-form";

export default function NewBusinessPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create business</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Paste the official Google review link from Business Profile. Five
          default rating attributes are seeded automatically.
        </p>
      </div>
      <BusinessForm />
    </section>
  );
}
