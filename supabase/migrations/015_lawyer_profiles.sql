-- ══════════════════════════════════════════════════════════
-- Migration 015: Lawyer (עו״ד) Provider Profile
-- Adds the type-specific profile table for lawyers representing
-- tenants in pinui-binui projects. Mirrors the architect/appraiser
-- pattern from migration 012 (1:1 with profiles.id, public read,
-- self-manage). No real Postgres provider_type enum exists in this
-- codebase — provider type is inferred at runtime from which
-- *_profiles table the user has a row in (see provider.ts router).
-- Idempotent — safe to re-run.
-- ══════════════════════════════════════════════════════════

-- ── 1. Lawyer profile (1:1 with profiles.id) ────────────
CREATE TABLE IF NOT EXISTS public.lawyer_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Office / professional identity
  office_name text,
  license_number text,
  years_of_experience integer,
  -- Geographic coverage
  city text,                                    -- primary city
  neighborhoods text[] DEFAULT '{}'::text[],    -- multi-select neighborhoods
  -- Specializations:
  --   pinui_binui, tama38, complex_compounds, small_projects,
  --   difficult_tenant, litigation_realestate
  specializations text[] DEFAULT '{}'::text[],
  -- Project-fit preferences:
  --   preferred_project_sizes: small, medium, large
  --   preferred_complexity:    low, medium, high
  preferred_project_sizes text[] DEFAULT '{}'::text[],
  preferred_complexity text[] DEFAULT '{}'::text[],
  accepts_low_feasibility boolean DEFAULT false,
  accepts_difficult_projects boolean DEFAULT false,
  -- Track record
  completed_projects_count integer DEFAULT 0,
  in_progress_projects_count integer DEFAULT 0,
  completed_project_types text[] DEFAULT '{}'::text[],
  sample_documents_urls text[] DEFAULT '{}'::text[],
  -- Array of {name, phone, project_name}
  references jsonb DEFAULT '[]'::jsonb,
  why_choose_me text,
  -- Fee model:
  --   fee_structure: from_developer, from_tenants, mixed
  fee_structure text CHECK (fee_structure IN ('from_developer','from_tenants','mixed')),
  fee_percent numeric(5,2),
  fee_fixed_amount numeric(12,2),
  fee_special_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── 2. Indexes for matching ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lawyer_profiles_city
  ON public.lawyer_profiles(city);
CREATE INDEX IF NOT EXISTS idx_lawyer_profiles_specializations
  ON public.lawyer_profiles USING GIN (specializations);

-- ── 3. RLS — same pattern as architect_profiles ─────────
ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view lawyer profiles" ON public.lawyer_profiles;
CREATE POLICY "Anyone authenticated can view lawyer profiles"
  ON public.lawyer_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own lawyer profile" ON public.lawyer_profiles;
CREATE POLICY "Users manage own lawyer profile"
  ON public.lawyer_profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 4. updated_at trigger (uses helper from migration 012) ──
DROP TRIGGER IF EXISTS trg_lawyer_profiles_updated_at ON public.lawyer_profiles;
CREATE TRIGGER trg_lawyer_profiles_updated_at
  BEFORE UPDATE ON public.lawyer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.lawyer_profiles IS 'Type-specific profile for lawyer (עו״ד) providers representing tenants';
