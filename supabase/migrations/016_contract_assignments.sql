-- ══════════════════════════════════════════════════════════
-- Migration 016: Contract Assignments + Approvals
-- Documents the already-live schema (tables were created out-of-band
-- before migrations were a source of truth). Idempotent — guards
-- prevent re-creation. Backing table for tenders.ts flow:
-- awardTender → uploadContract → startApproval → approveContract
-- with auto-threshold at approval_required_count.
-- ══════════════════════════════════════════════════════════

-- ── 1. Assignment (tender win → active provider pipeline) ───
CREATE TABLE IF NOT EXISTS public.contract_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  meeting_scheduled_at timestamptz,
  meeting_completed boolean DEFAULT false,
  contract_file_url text,
  contract_uploaded_at timestamptz,
  approval_required_count integer,
  approvals_received integer DEFAULT 0,
  status text DEFAULT 'pending_meeting'
    CHECK (status IN ('pending_meeting','meeting_done','contract_uploaded','pending_approval','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

-- ── 2. Per-apartment approvals ─────────────────────────────
-- apartment_id is soft-referenced (no FK — apartment model lives in
-- units table, but the backend treats this as an opaque identifier).
CREATE TABLE IF NOT EXISTS public.contract_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.contract_assignments(id),
  apartment_id uuid NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  approved boolean,
  approved_at timestamptz DEFAULT now(),
  UNIQUE (assignment_id, apartment_id)
);

-- ── 3. RLS — service_role handles all access via backend ────
ALTER TABLE public.contract_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_approvals    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_contract_assignments" ON public.contract_assignments;
CREATE POLICY "service_role_all_contract_assignments" ON public.contract_assignments
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_contract_approvals" ON public.contract_approvals;
CREATE POLICY "service_role_all_contract_approvals" ON public.contract_approvals
  TO service_role USING (true) WITH CHECK (true);
