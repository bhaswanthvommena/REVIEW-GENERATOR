import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy stub for the Ventry MVP.",
};

const sections = [
  { id: "who", label: "Who this covers" },
  { id: "stored", label: "What we store" },
  { id: "drafts", label: "Draft generation" },
  { id: "deletion", label: "Deletion" },
  { id: "stub", label: "Not legal advice" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy"
      lede="This is an MVP stub, not legal advice. Replace it with a counsel-reviewed policy before a public launch."
      sections={sections}
    >
      <section id="who" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Who this covers</h2>
        <p className="mt-2">
          Business owners authenticate with Supabase Auth. The auth provider stores the account
          email. Customers who open a QR link do not create accounts.
        </p>
      </section>
      <section id="stored" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">What we store</h2>
        <p className="mt-2">
          For a customer visit we store ratings, an optional free-text comment, the generated draft,
          and anonymous analytics events tied to the business and QR. We do not ask for a customer
          email or phone number in the public flow.
        </p>
      </section>
      <section id="drafts" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Draft generation</h2>
        <p className="mt-2">
          Drafts are produced by Google Gemini on the server. The customer comment is sent to Gemini
          so the draft can reflect what they wrote. They can edit the draft before copying it.
        </p>
      </section>
      <section id="deletion" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Deletion</h2>
        <p className="mt-2">
          Deleting a business cascades related feedback, drafts, QR codes, and analytics in the
          application database. Until a formal contact is published, send deletion requests to the
          business owner or the operator of this deployment.
        </p>
      </section>
      <section id="stub" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Not legal advice</h2>
        <p className="mt-2">
          This page describes the MVP data flow. It is not a complete privacy policy and should be
          replaced before production launch.
        </p>
      </section>
    </LegalLayout>
  );
}
