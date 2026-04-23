-- ══════════════════════════════════════════════════════════
-- Migration 014: Developer Forms (Phase 2c)
-- Four dedicated tables for developer workflow:
--   1. developer_project_proposals (טופס פתיחת פרויקט)
--   2. developer_accompaniment_forms (טופס ליווי פרויקט)
--   3. developer_economic_plans (טופס כלכלי)
--   4. developer_bids (טופס הצעות/מכרזים)
-- Idempotent.
-- ══════════════════════════════════════════════════════════

-- ── 1. Project opening proposals ────────────────────────
CREATE TABLE IF NOT EXISTS public.developer_project_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  address text NOT NULL,
  city text NOT NULL,
  project_type text NOT NULL CHECK (project_type IN ('pinuy_binuy','tama_38_2','chalufat_shaked','binui_pinui')),
  tenants_count integer,
  complex_type text CHECK (complex_type IN ('single_building','multi_building','cluster')),
  profit_target_pct numeric(5,2),
  risk_level text CHECK (risk_level IN ('low','medium','high')),
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_proposals_developer ON public.developer_project_proposals(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_proposals_status ON public.developer_project_proposals(status);

ALTER TABLE public.developer_project_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developer sees own proposals" ON public.developer_project_proposals;
CREATE POLICY "Developer sees own proposals"
  ON public.developer_project_proposals FOR SELECT TO authenticated
  USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developer creates own proposals" ON public.developer_project_proposals;
CREATE POLICY "Developer creates own proposals"
  ON public.developer_project_proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developer updates own proposals" ON public.developer_project_proposals;
CREATE POLICY "Developer updates own proposals"
  ON public.developer_project_proposals FOR UPDATE TO authenticated
  USING (auth.uid() = developer_id);

-- ── 2. Accompaniment form ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.developer_accompaniment_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.developer_project_proposals(id) ON DELETE CASCADE,
  contractor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contractor_name text,
  appraiser_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  architect_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organizer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (proposal_id)
);

ALTER TABLE public.developer_accompaniment_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accompaniment visible to proposal owner" ON public.developer_accompaniment_forms;
CREATE POLICY "Accompaniment visible to proposal owner"
  ON public.developer_accompaniment_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Accompaniment managed by proposal owner" ON public.developer_accompaniment_forms;
CREATE POLICY "Accompaniment managed by proposal owner"
  ON public.developer_accompaniment_forms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ));

-- ── 3. Economic plan ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.developer_economic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.developer_project_proposals(id) ON DELETE CASCADE,
  expected_profit numeric(15,2),
  construction_costs numeric(15,2),
  financing_source text,
  financing_amount numeric(15,2),
  timeline_months integer,
  economic_risks text,
  market_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (proposal_id)
);

ALTER TABLE public.developer_economic_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Economic plan visible to proposal owner" ON public.developer_economic_plans;
CREATE POLICY "Economic plan visible to proposal owner"
  ON public.developer_economic_plans FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Economic plan managed by proposal owner" ON public.developer_economic_plans;
CREATE POLICY "Economic plan managed by proposal owner"
  ON public.developer_economic_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.developer_project_proposals p
    WHERE p.id = proposal_id AND p.developer_id = auth.uid()
  ));

-- ── 4. Developer bids ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.developer_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.developer_project_proposals(id) ON DELETE SET NULL,
  bid_type text,
  execution_terms text,
  guarantees text,
  warranty_period_months integer,
  plain_language_detail text NOT NULL CHECK (char_length(plain_language_detail) >= 10),
  price_total numeric(15,2),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','withdrawn','awarded','rejected')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_bids_developer ON public.developer_bids(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_bids_tender ON public.developer_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_dev_bids_proposal ON public.developer_bids(proposal_id);

ALTER TABLE public.developer_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developer sees own bids" ON public.developer_bids;
CREATE POLICY "Developer sees own bids"
  ON public.developer_bids FOR SELECT TO authenticated
  USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developer creates own bids" ON public.developer_bids;
CREATE POLICY "Developer creates own bids"
  ON public.developer_bids FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developer updates own bids" ON public.developer_bids;
CREATE POLICY "Developer updates own bids"
  ON public.developer_bids FOR UPDATE TO authenticated
  USING (auth.uid() = developer_id);

-- ── updated_at triggers ─────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['developer_project_proposals','developer_accompaniment_forms','developer_economic_plans','developer_bids'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END $$;
