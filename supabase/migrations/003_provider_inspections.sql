-- ════════════════════════════════════════════════════
-- 003 - Provider Inspection System
-- Plans, Inspections, Scoring, Files, Notifications
-- ════════════════════════════════════════════════════

-- ─── ENUMS ───────────────────────────────────────────

CREATE TYPE provider_plan AS ENUM ('basic', 'pro');

CREATE TYPE inspection_type AS ENUM (
  -- Architect
  'architectural_feasibility',
  'planning_check',
  'cluster_feasibility',
  'constraints_check',
  -- Appraiser
  'economic_feasibility',
  'property_valuation',
  'rental_assessment',
  'commercial_appraisal'
);

CREATE TYPE inspection_conclusion AS ENUM (
  -- Architect conclusions
  'single_building', 'prefer_cluster', 'complex', 'not_recommended',
  -- Appraiser conclusions
  'economic', 'borderline', 'not_economic'
);

CREATE TYPE inspection_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- ─── PROVIDER PLANS ──────────────────────────────────

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS plan provider_plan NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS contribution_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ranking_score integer GENERATED ALWAYS AS (
    (CASE plan WHEN 'pro' THEN 100 ELSE 0 END) + contribution_score + quality_score
  ) STORED;

-- ─── INSPECTIONS TABLE ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  status inspection_status NOT NULL DEFAULT 'draft',
  conclusion inspection_conclusion,
  slot_number integer, -- 1, 2, or 3 (max 3 per type per project)

  -- Common fields
  building_address text,
  apartment_count integer,
  floor_count integer,
  notes text,

  -- Architect: Feasibility fields
  relevant_plan text,            -- תב"ע רלוונטית
  building_rights text,          -- זכויות בנייה
  height_restriction text,
  heritage_site boolean DEFAULT false,
  antiquities boolean DEFAULT false,
  parking_notes text,
  infrastructure_notes text,

  -- Architect: Planning Check
  plan_number text,
  land_use text,
  building_coverage_pct numeric,
  planning_limitations text,

  -- Architect: Cluster
  suitable_standalone boolean,
  recommended_cluster_count integer,
  cluster_notes text,

  -- Architect: Constraints
  heritage_constraint text,
  antiquities_constraint text,
  infrastructure_constraint text,
  street_width_constraint text,

  -- Appraiser: Economic Feasibility
  existing_units integer,
  avg_sqm numeric,
  current_unit_value numeric,
  new_unit_value numeric,
  construction_cost_per_sqm numeric,

  -- Appraiser: Property Valuation
  avg_property_value numeric,
  floor_variance_pct numeric,

  -- Appraiser: Rental Assessment
  avg_monthly_rent numeric,
  evacuation_period_months integer,

  -- Appraiser: Commercial
  commercial_use_type text,
  commercial_value numeric,

  is_useful boolean,        -- marked by system/lawyer/committee
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, inspection_type, provider_id)
);

-- Max 3 submissions per inspection type per project
CREATE UNIQUE INDEX IF NOT EXISTS inspections_slot_idx
  ON public.inspections (project_id, inspection_type, slot_number);

-- ─── INSPECTION FILES ────────────────────────────────

CREATE TYPE inspection_file_type AS ENUM (
  'report_pdf', 'sketch', 'blueprint', 'map', 'photo',
  'tama_doc', 'cluster_map', 'valuation_report',
  'rent_table', 'commercial_report', 'other'
);

CREATE TABLE IF NOT EXISTS public.inspection_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  file_type inspection_file_type NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes integer,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- ─── PROVIDER NOTIFICATIONS ──────────────────────────

CREATE TYPE provider_notification_type AS ENUM (
  'new_project_opened',
  'architect_inspection_needed',
  'appraiser_inspection_needed',
  'new_project_in_region',
  'inspection_slot_closing'
);

CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  notification_type provider_notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── FUNCTION: assign inspection slot ────────────────

CREATE OR REPLACE FUNCTION assign_inspection_slot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_slot integer;
BEGIN
  SELECT COALESCE(MAX(slot_number), 0) + 1
    INTO next_slot
    FROM public.inspections
    WHERE project_id = NEW.project_id
      AND inspection_type = NEW.inspection_type
      AND status != 'rejected';

  IF next_slot > 3 THEN
    RAISE EXCEPTION 'Maximum 3 inspections per type per project';
  END IF;

  NEW.slot_number := next_slot;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_assign_inspection_slot ON public.inspections;
CREATE TRIGGER tr_assign_inspection_slot
  BEFORE INSERT ON public.inspections
  FOR EACH ROW WHEN (NEW.slot_number IS NULL)
  EXECUTE FUNCTION assign_inspection_slot();

-- ─── FUNCTION: update provider scores ────────────────

CREATE OR REPLACE FUNCTION update_provider_contribution_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- +10 for each submitted inspection
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    UPDATE public.provider_profiles
      SET contribution_score = contribution_score + 10,
          quality_score = quality_score + CASE WHEN NEW.slot_number = 1 THEN 5 ELSE 0 END
      WHERE id = NEW.provider_id;
  END IF;

  -- +15 quality bonus when marked useful
  IF NEW.is_useful = true AND OLD.is_useful IS DISTINCT FROM true THEN
    UPDATE public.provider_profiles
      SET quality_score = quality_score + 15
      WHERE id = NEW.provider_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_provider_scoring ON public.inspections;
CREATE TRIGGER tr_provider_scoring
  AFTER UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_contribution_score();

-- ─── RLS ─────────────────────────────────────────────

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

-- Inspections: provider sees own, managers/committee see all
CREATE POLICY "provider_own_inspections" ON public.inspections
  FOR ALL USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('manager', 'organizer', 'admin', 'lawyer')
    )
  );

-- Files: same as inspection
CREATE POLICY "inspection_files_access" ON public.inspection_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        i.provider_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'organizer', 'admin', 'lawyer'))
      )
    )
  );

-- Notifications: own only
CREATE POLICY "own_notifications" ON public.provider_notifications
  FOR ALL USING (provider_id = auth.uid());

-- Public read for submitted inspections (committee/tenants can see)
CREATE POLICY "submitted_inspections_public" ON public.inspections
  FOR SELECT USING (status IN ('submitted', 'approved'));
