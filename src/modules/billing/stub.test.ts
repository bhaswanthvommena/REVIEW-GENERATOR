import { describe, expect, it } from "vitest";
import { StubBillingProvider } from "./index";

describe("StubBillingProvider", () => {
  it("returns free plan without Stripe", async () => {
    const provider = new StubBillingProvider();
    const customer = await provider.getCustomer("00000000-0000-0000-0000-000000000001");
    expect(customer.plan).toBe("free");
    expect(customer.stripeCustomerId).toBeNull();
  });
});
