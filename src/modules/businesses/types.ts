export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  category: string | null;
  description: string | null;
  google_review_url: string;
  plan: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};
