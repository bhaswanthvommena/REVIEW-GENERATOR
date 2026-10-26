import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use stub for the Review Generator MVP.",
};

const sections = [
  { id: "service", label: "The service" },
  { id: "google", label: "Google" },
  { id: "use", label: "Acceptable use" },
  { id: "gating", label: "No gating" },
  { id: "abuse", label: "Abuse" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of use"
      lede="This is an MVP stub, not a binding contract. Replace it before a production launch."
      sections={sections}
    >
      <section id="service" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">The service</h2>
        <p className="mt-2">
          Review Generator helps a customer draft a review from their own ratings and comment. They
          must read the draft and correct anything that is not true before posting it.
        </p>
      </section>
      <section id="google" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Google</h2>
        <p className="mt-2">
          We do not post reviews to Google for anyone. This MVP does not store Google Business
          Profile credentials. The owner pastes an official review link.
        </p>
      </section>
      <section id="use" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Acceptable use</h2>
        <p className="mt-2">
          Do not use the product to ask only for positive reviews, to offer incentives, or to invent
          experiences the customer did not have.
        </p>
      </section>
      <section id="gating" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">No gating</h2>
        <p className="mt-2">
          Continue to Google is always available. It is never hidden or disabled because of a star
          rating or the wording of a draft.
        </p>
      </section>
      <section id="abuse" className="scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Abuse</h2>
        <p className="mt-2">
          Scraping tokens or trying to bypass rate limits can result in access being revoked.
        </p>
      </section>
    </LegalLayout>
  );
}
