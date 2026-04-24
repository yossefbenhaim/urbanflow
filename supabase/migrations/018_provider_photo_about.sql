-- ══════════════════════════════════════════════════════════
-- Migration 018: Provider business-card fields
-- Adds photo_url + about (free-form "pitch") to provider_profiles.
-- The existing `bio` field on the type-specific tables stays as a
-- legacy alias; new code should write/read `about`.
-- Idempotent.
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS about text;

COMMENT ON COLUMN public.provider_profiles.photo_url IS
  'Public URL to the provider''s profile photo (served from Supabase storage documents bucket, avatars/{userId}/ path).';
COMMENT ON COLUMN public.provider_profiles.about IS
  'Free-form Hebrew "about me" text shown on the public provider card.';
