import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardNotFound() {
  return (
    <EmptyState
      title="That page is not here"
      description="It may have moved, or it does not belong to this account."
      action={
        <Link href="/dashboard" className={buttonVariants()}>
          Back to overview
        </Link>
      }
    />
  );
}
