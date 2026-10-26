-- A rating question can be removed after customers have answered it.
-- The row stays so feedback_ratings keep their foreign key and label.
-- A hard delete detaches those ratings instead of failing the constraint.

alter table public.rating_attributes
  add column deleted_at timestamptz;

alter table public.rating_attributes
  drop constraint rating_attributes_business_id_label_key;

create unique index rating_attributes_business_label_live_uidx
  on public.rating_attributes (business_id, label)
  where deleted_at is null;

alter table public.feedback_ratings
  alter column attribute_id drop not null;

alter table public.feedback_ratings
  drop constraint feedback_ratings_attribute_same_business_fkey;

alter table public.feedback_ratings
  add constraint feedback_ratings_attribute_same_business_fkey
  foreign key (attribute_id, business_id)
  references public.rating_attributes (id, business_id)
  on delete set null (attribute_id);
