-- Guard billing-gated columns on the businesses table.
-- Authenticated owners (via PostgREST) cannot directly change plan or stripe_customer_id.
-- The service_role (used by Route Handlers) bypasses triggers in Supabase.

CREATE OR REPLACE FUNCTION public.guard_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.plan IS DISTINCT FROM OLD.plan) OR
     (NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id) THEN
    RAISE EXCEPTION 'billing_columns_protected: plan and stripe_customer_id cannot be changed directly';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to authenticated-role writes only (service_role bypasses RLS and triggers
-- that use security invoker; this trigger fires for all roles via BEFORE UPDATE).
CREATE TRIGGER businesses_guard_billing
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_billing_columns();
