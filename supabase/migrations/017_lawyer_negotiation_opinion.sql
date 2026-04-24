-- ══════════════════════════════════════════════════════════
-- Migration 017: Lawyer negotiation translation + legal opinions
-- Extends negotiation_rounds with fields the lawyer uses to
-- translate each round for residents (pros/cons/risks/recommendation)
-- and adds a legal_opinions table for formal legal assessments
-- per assignment.
-- ══════════════════════════════════════════════════════════

-- ── 1. Extend negotiation_rounds with lawyer translation fields ──
ALTER TABLE public.negotiation_rounds
  ADD COLUMN IF NOT EXISTS what_it_means text,
  ADD COLUMN IF NOT EXISTS pros text,
  ADD COLUMN IF NOT EXISTS cons text,
  ADD COLUMN IF NOT EXISTS risks text,
  ADD COLUMN IF NOT EXISTS recommendation text
    CHECK (recommendation IS NULL OR recommendation IN ('accept','reject','negotiate','neutral')),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'
    CHECK (status IN ('open','improved','pending','closed'));

-- ── 2. Legal opinions (חוות דעת משפטית) ─────────────────────
CREATE TABLE IF NOT EXISTS public.legal_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.contract_assignments(id) ON DELETE CASCADE,
  lawyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_worthwhile boolean,
  feasibility_level text
    CHECK (feasibility_level IS NULL OR feasibility_level IN ('low','medium','high')),
  complexity_level text
    CHECK (complexity_level IS NULL OR complexity_level IN ('low','medium','high')),
  risks text,
  would_join boolean,
  summary text,
  document_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_opinions_lawyer
  ON public.legal_opinions(lawyer_id);

-- ── 3. RLS — service_role only (backend gate) ──────────────
ALTER TABLE public.legal_opinions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_legal_opinions" ON public.legal_opinions;
CREATE POLICY "service_role_all_legal_opinions" ON public.legal_opinions
  TO service_role USING (true) WITH CHECK (true);
