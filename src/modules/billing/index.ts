/**
 * Billing extension point (stub). Stripe is out of scope for MVP.
 * Schema seams: businesses.plan, businesses.stripe_customer_id.
 */

export type PlanId = "free" | "pro" | "enterprise";

export type BillingCustomer = {
  businessId: string;
  plan: PlanId;
  stripeCustomerId: string | null;
};

/**
 * Future Stripe adapter implements this. MVP returns free-plan stubs only.
 */
export interface BillingProvider {
  getCustomer(businessId: string): Promise<BillingCustomer>;
  createCheckoutSession?(businessId: string, plan: PlanId): Promise<{ url: string }>;
  syncSubscription?(stripeCustomerId: string): Promise<BillingCustomer>;
}

export class StubBillingProvider implements BillingProvider {
  async getCustomer(businessId: string): Promise<BillingCustomer> {
    return {
      businessId,
      plan: "free",
      stripeCustomerId: null,
    };
  }
}

export const billingProvider: BillingProvider = new StubBillingProvider();
