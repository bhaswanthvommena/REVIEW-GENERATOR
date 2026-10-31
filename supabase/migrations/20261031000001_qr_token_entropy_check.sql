-- Strengthen the QR public_token constraint to enforce base64url format and
-- minimum real entropy (43 base64url chars = 32 bytes = what generatePublicToken(32) produces).

ALTER TABLE public.qr_codes
  DROP CONSTRAINT IF EXISTS qr_codes_public_token_check;

ALTER TABLE public.qr_codes
  ADD CONSTRAINT qr_codes_public_token_entropy
  CHECK (public_token ~ '^[A-Za-z0-9_-]{43,}$');
