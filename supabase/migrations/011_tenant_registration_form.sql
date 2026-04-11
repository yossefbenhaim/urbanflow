-- ══════════════════════════════════════════════════════════
-- Migration 011: Tenant Registration Form - New Fields
-- Sections 3 (Living Status), 4 (Property Relation),
-- 5 (Co-owners), 8 (Companion), 10 (Declarations)
-- ══════════════════════════════════════════════════════════

-- ── Section 3: Living Status ────────────────────────────
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS is_residing boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS residing_status text CHECK (residing_status IN ('renter', 'family_member', 'empty'));

-- ── Section 4: Property Relation ────────────────────────
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS property_relation text CHECK (property_relation IN ('owner', 'renter', 'heir', 'power_of_attorney'));

-- ── Section 5: Co-owners ────────────────────────────────
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS co_owners_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ownership_complexity_flag text CHECK (ownership_complexity_flag IN ('simple', 'complex')) DEFAULT 'simple';

-- ── Section 10: Declarations ────────────────────────────
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS declarations_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS declarations_accepted_at timestamptz;

-- ── Tenant Partners (Section 5 - Repeater) ──────────────
CREATE TABLE IF NOT EXISTS tenant_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_partners_user ON tenant_partners(user_id);

-- ── Tenant Companions (Section 8) ───────────────────────
CREATE TABLE IF NOT EXISTS tenant_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  role text DEFAULT 'viewer' CHECK (role IN ('viewer')),
  invite_sent boolean DEFAULT false,
  invite_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_companions_user ON tenant_companions(user_id);

-- ── RLS Policies ────────────────────────────────────────
ALTER TABLE tenant_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own partners" ON tenant_partners
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own companions" ON tenant_companions
  FOR ALL USING (auth.uid() = user_id);
