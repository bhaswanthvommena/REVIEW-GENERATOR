import { PageHeader } from "@/components/dashboard/page-header";
import { BusinessForm } from "./business-form";

export default function NewBusinessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create business"
        description="Name the business and paste the official Google review link. Five rating questions are added for you."
      />
      <BusinessForm />
    </div>
  );
}
