-- ══════════════════════════════════════════════════════════
-- Migration 021: Provider Selection Workflow
--
-- Spec (from Yossef's Telegram instructions 2026-05-15):
--   1. ועד invites a service provider → provider stays visible in
--      search with "invitation sent" pill (handled in directory.getProviders).
--   2. Provider accepts → negotiation chat opens between the two parties.
--   3. Both sides explicitly mark "agreed".
--   4. On both-agreed → an automatic poll opens to ALL tenants in the
--      building (48h window, 60% of *all tenants* — not just voters).
--   5. Poll passes → both parties get "upload contract" building_tasks;
--      every other parallel negotiation for the same building+role gets
--      auto-closed as 'superseded'.
--   6. Building tasks are bound to the BUILDING (so when a developer or
--      organizer later joins, the same tasks transfer to them).
--   7. Status changes write system messages into the negotiation chat
--      so both sides see the context.
-- ══════════════════════════════════════════════════════════

-- ── 1. Negotiations (one row per invitation, full lifecycle) ──
CREATE TABLE IF NOT EXISTS public.provider_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  provider_id uuid NOT NULL REFERENCES auth.users(id),
  provider_role text NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN (
    'invited',
    'accepted_by_provider',
    'in_negotiation',
    'agreed_by_provider',
    'agreed_by_committee',
    'both_agreed',
    'polling',
    'approved',
    'rejected_by_tenants',
    'cancelled',
    'superseded'
  )),
  committee_agreed_at timestamptz,
  provider_agreed_at timestamptz,
  poll_id uuid,
  poll_deadline timestamptz,
  result text CHECK (result IS NULL OR result IN ('won','lost')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pn_unique_pair
  ON public.provider_negotiations(building_id, provider_id, provider_role)
  WHERE status NOT IN ('cancelled','superseded','rejected_by_tenants');

CREATE INDEX IF NOT EXISTS idx_pn_building ON public.provider_negotiations(building_id);
CREATE INDEX IF NOT EXISTS idx_pn_provider ON public.provider_negotiations(provider_id);
CREATE INDEX IF NOT EXISTS idx_pn_invited_by ON public.provider_negotiations(invited_by);
CREATE INDEX IF NOT EXISTS idx_pn_status ON public.provider_negotiations(status);

-- ── 2. Negotiation messages (chat + system events) ──
CREATE TABLE IF NOT EXISTS public.negotiation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.provider_negotiations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat','system','agreement','poll_started','poll_finalized')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nm_negotiation
  ON public.negotiation_messages(negotiation_id, created_at);

-- ── 3. Building tasks (transferable to future developer/organizer) ──
CREATE TABLE IF NOT EXISTS public.building_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_role text,
  source text,
  source_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  file_url text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bt_assigned ON public.building_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_bt_building ON public.building_tasks(building_id, status);
CREATE INDEX IF NOT EXISTS idx_bt_source ON public.building_tasks(source, source_id);

-- ── 4. Link polls to negotiations (light coupling) ──
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS related_negotiation_id uuid
  REFERENCES public.provider_negotiations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_polls_related_negotiation
  ON public.polls(related_negotiation_id)
  WHERE related_negotiation_id IS NOT NULL;

-- ── 5. RLS ──
ALTER TABLE public.provider_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_tasks ENABLE ROW LEVEL SECURITY;

-- Negotiations: visible to the inviter (ועד), the invited provider, and
-- any tenant in the building (so they can see the polls/status).
DROP POLICY IF EXISTS pn_select ON public.provider_negotiations;
CREATE POLICY pn_select ON public.provider_negotiations FOR SELECT
  USING (
    invited_by = auth.uid()
    OR provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tenant_profiles tp
      WHERE tp.user_id = auth.uid() AND tp.building_id = provider_negotiations.building_id
    )
  );

DROP POLICY IF EXISTS pn_insert ON public.provider_negotiations;
CREATE POLICY pn_insert ON public.provider_negotiations FOR INSERT
  WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS pn_update ON public.provider_negotiations;
CREATE POLICY pn_update ON public.provider_negotiations FOR UPDATE
  USING (invited_by = auth.uid() OR provider_id = auth.uid());

-- Messages: only the two parties (inviter and provider) can see/post.
DROP POLICY IF EXISTS nm_select ON public.negotiation_messages;
CREATE POLICY nm_select ON public.negotiation_messages FOR SELECT
  USING (
    negotiation_id IN (
      SELECT id FROM public.provider_negotiations
      WHERE invited_by = auth.uid() OR provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS nm_insert ON public.negotiation_messages;
CREATE POLICY nm_insert ON public.negotiation_messages FOR INSERT
  WITH CHECK (
    sender_id IS NULL
    OR (
      sender_id = auth.uid()
      AND negotiation_id IN (
        SELECT id FROM public.provider_negotiations
        WHERE invited_by = auth.uid() OR provider_id = auth.uid()
      )
    )
  );

-- Building tasks: assignee + committee reps + tenants of that building can see.
DROP POLICY IF EXISTS bt_select ON public.building_tasks;
CREATE POLICY bt_select ON public.building_tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tenant_profiles tp
      WHERE tp.user_id = auth.uid() AND tp.building_id = building_tasks.building_id
    )
  );

DROP POLICY IF EXISTS bt_insert ON public.building_tasks;
CREATE POLICY bt_insert ON public.building_tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS bt_update ON public.building_tasks;
CREATE POLICY bt_update ON public.building_tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tenant_profiles tp ON tp.user_id = p.id
      WHERE p.id = auth.uid()
        AND tp.building_id = building_tasks.building_id
        AND p.is_building_representative = true
    )
  );

-- ── 6. Auto-update updated_at on negotiations + tasks ──
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pn_updated_at ON public.provider_negotiations;
CREATE TRIGGER trg_pn_updated_at BEFORE UPDATE ON public.provider_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_bt_updated_at ON public.building_tasks;
CREATE TRIGGER trg_bt_updated_at BEFORE UPDATE ON public.building_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
