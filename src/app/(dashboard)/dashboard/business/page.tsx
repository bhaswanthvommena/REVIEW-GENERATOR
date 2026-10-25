import { BusinessForm } from "./business-form";

export default function NewBusinessPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create business</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Name the business and paste the official Google review link. Five
          rating questions are added for you.
        </p>
      </div>
      <BusinessForm />
    </section>
  );
}
