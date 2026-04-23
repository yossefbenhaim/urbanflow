-- ══════════════════════════════════════════════════════════
-- Migration 012: Service Provider Foundation
-- Adds type-specific profile tables (architect, appraiser),
-- extends developer_profiles, plus match preferences, ratings,
-- tasks, meeting polls, meeting summaries, insights uploads,
-- and tiered document classification.
-- ══════════════════════════════════════════════════════════

-- ── 1. Extend developer_profiles with spec fields ───────
ALTER TABLE public.developer_profiles
  ADD COLUMN IF NOT EXISTS default_profit_target_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS default_risk_tolerance text CHECK (default_risk_tolerance IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS preferred_complex_type text CHECK (preferred_complex_type IN ('single_building','multi_building','cluster')),
  ADD COLUMN IF NOT EXISTS preferred_project_types text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS typical_financing_source text;

-- ── 2. Architect profile (1:1 with profiles.id) ─────────
CREATE TABLE IF NOT EXISTS public.architect_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company text,
  license_number text,
  license_authority text,
  license_expiry date,
  operating_regions text[] DEFAULT '{}'::text[],
  experience_years integer,
  completed_projects integer DEFAULT 0,
  specializations text[] DEFAULT '{}'::text[],
    -- e.g.: pinuy_binuy, tama_38_2, chalufat_shaked, binui_pinui, residential, commercial, preservation
  portfolio_urls text[] DEFAULT '{}'::text[],
  bio text,
  website text,
  linkedin_url text,
  supports_rights_transfer boolean DEFAULT false,
  preservation_certified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.architect_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view architect profiles" ON public.architect_profiles;
CREATE POLICY "Anyone authenticated can view architect profiles"
  ON public.architect_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own architect profile" ON public.architect_profiles;
CREATE POLICY "Users manage own architect profile"
  ON public.architect_profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 3. Appraiser profile (1:1 with profiles.id) ─────────
CREATE TABLE IF NOT EXISTS public.appraiser_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company text,
  license_number text,
  license_authority text,
  license_expiry date,
  operating_regions text[] DEFAULT '{}'::text[],
  experience_years integer,
  completed_projects integer DEFAULT 0,
  specialization_types text[] DEFAULT '{}'::text[],
    -- e.g.: residential, commercial, mixed_use, industrial
  portfolio_urls text[] DEFAULT '{}'::text[],
  bio text,
  website text,
  linkedin_url text,
  offers_market_analysis boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.appraiser_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view appraiser profiles" ON public.appraiser_profiles;
CREATE POLICY "Anyone authenticated can view appraiser profiles"
  ON public.appraiser_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own appraiser profile" ON public.appraiser_profiles;
CREATE POLICY "Users manage own appraiser profile"
  ON public.appraiser_profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 4. Provider match preferences ───────────────────────
CREATE TABLE IF NOT EXISTS public.provider_match_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cities text[] DEFAULT '{}'::text[],
  project_types text[] DEFAULT '{}'::text[],
    -- pinuy_binuy, tama_38_2, chalufat_shaked, binui_pinui
  complexity_pref text CHECK (complexity_pref IN ('low','medium','high','any')) DEFAULT 'any',
  risk_pref text CHECK (risk_pref IN ('low','medium','high','any')) DEFAULT 'any',
  min_profitability_pct numeric(5,2),
  work_type text CHECK (work_type IN ('full_accompaniment','spot_consulting','specific_phase','any')) DEFAULT 'any',
  preferred_timeline_months integer,
  min_score_for_notification integer DEFAULT 70 CHECK (min_score_for_notification BETWEEN 0 AND 100),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_match_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own match preferences" ON public.provider_match_preferences;
CREATE POLICY "Users manage own match preferences"
  ON public.provider_match_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 5. Provider ratings (external links + in-app) ───────
CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('in_app','yad2','google_maps','facebook','linkedin','custom')),
  external_url text,
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  review_count integer DEFAULT 0,
  verified boolean DEFAULT false,
  submitted_by uuid REFERENCES auth.users(id),
    -- null when self-reported, set for in-app tenant ratings
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_ratings_user ON public.provider_ratings(user_id);

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings visible to all authenticated" ON public.provider_ratings;
CREATE POLICY "Ratings visible to all authenticated"
  ON public.provider_ratings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Providers can self-report external links" ON public.provider_ratings;
CREATE POLICY "Providers can self-report external links"
  ON public.provider_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND source <> 'in_app');

DROP POLICY IF EXISTS "Tenants can submit in-app ratings" ON public.provider_ratings;
CREATE POLICY "Tenants can submit in-app ratings"
  ON public.provider_ratings FOR INSERT TO authenticated
  WITH CHECK (source = 'in_app' AND auth.uid() = submitted_by AND auth.uid() <> user_id);

DROP POLICY IF EXISTS "Users can update own external rating rows" ON public.provider_ratings;
CREATE POLICY "Users can update own external rating rows"
  ON public.provider_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND source <> 'in_app');

-- ── 6. Project tasks ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task visible to creator, assignee, or project manager" ON public.project_tasks;
CREATE POLICY "Task visible to creator, assignee, or project manager"
  ON public.project_tasks FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.manager_id = auth.uid())
  );

DROP POLICY IF EXISTS "Manager or creator can insert tasks" ON public.project_tasks;
CREATE POLICY "Manager or creator can insert tasks"
  ON public.project_tasks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.manager_id = auth.uid() OR p.organizer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Creator, assignee, or manager can update" ON public.project_tasks;
CREATE POLICY "Creator, assignee, or manager can update"
  ON public.project_tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.manager_id = auth.uid())
  );

-- ── 7. Meeting date polls ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_date_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  tender_meeting_id uuid REFERENCES public.tender_meetings(id) ON DELETE SET NULL,
  proposer_id uuid NOT NULL REFERENCES auth.users(id),
  topic text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','finalized','cancelled')),
  finalized_option_id uuid,
  majority_required_pct numeric(5,2) DEFAULT 50,
  closes_at timestamptz,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  CHECK (project_id IS NOT NULL OR tender_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.meeting_date_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.meeting_date_polls(id) ON DELETE CASCADE,
  option_at timestamptz NOT NULL,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_date_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES public.meeting_date_options(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_weight numeric(5,2) DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (option_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON public.meeting_date_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.meeting_date_votes(option_id);

ALTER TABLE public.meeting_date_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_date_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_date_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Polls visible to project participants" ON public.meeting_date_polls;
CREATE POLICY "Polls visible to project participants"
  ON public.meeting_date_polls FOR SELECT TO authenticated USING (
    auth.uid() = proposer_id
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_tenants pt WHERE pt.project_id = meeting_date_polls.project_id AND pt.tenant_id = auth.uid()
    ))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = meeting_date_polls.project_id AND p.manager_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Proposer can create polls" ON public.meeting_date_polls;
CREATE POLICY "Proposer can create polls"
  ON public.meeting_date_polls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = proposer_id);

DROP POLICY IF EXISTS "Proposer can update polls" ON public.meeting_date_polls;
CREATE POLICY "Proposer can update polls"
  ON public.meeting_date_polls FOR UPDATE TO authenticated
  USING (auth.uid() = proposer_id);

DROP POLICY IF EXISTS "Options follow poll visibility" ON public.meeting_date_options;
CREATE POLICY "Options follow poll visibility"
  ON public.meeting_date_options FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meeting_date_polls p WHERE p.id = poll_id)
  );

DROP POLICY IF EXISTS "Proposer can manage options" ON public.meeting_date_options;
CREATE POLICY "Proposer can manage options"
  ON public.meeting_date_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meeting_date_polls p WHERE p.id = poll_id AND p.proposer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meeting_date_polls p WHERE p.id = poll_id AND p.proposer_id = auth.uid()));

DROP POLICY IF EXISTS "Users see votes" ON public.meeting_date_votes;
CREATE POLICY "Users see votes"
  ON public.meeting_date_votes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meeting_date_options o WHERE o.id = option_id)
  );

DROP POLICY IF EXISTS "Users vote as themselves" ON public.meeting_date_votes;
CREATE POLICY "Users vote as themselves"
  ON public.meeting_date_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users update own vote" ON public.meeting_date_votes;
CREATE POLICY "Users update own vote"
  ON public.meeting_date_votes FOR UPDATE TO authenticated USING (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users delete own vote" ON public.meeting_date_votes;
CREATE POLICY "Users delete own vote"
  ON public.meeting_date_votes FOR DELETE TO authenticated USING (auth.uid() = voter_id);

-- ── 8. Meeting summaries ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_meeting_id uuid NOT NULL REFERENCES public.tender_meetings(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  summary_text text NOT NULL,
  file_url text,
  action_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tender_meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_summaries_meeting ON public.meeting_summaries(tender_meeting_id);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Summary visible to meeting participants" ON public.meeting_summaries;
CREATE POLICY "Summary visible to meeting participants"
  ON public.meeting_summaries FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tender_meetings tm
      WHERE tm.id = tender_meeting_id
        AND (tm.reporter_id = auth.uid() OR tm.counterpart_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participant can insert summary" ON public.meeting_summaries;
CREATE POLICY "Participant can insert summary"
  ON public.meeting_summaries FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND EXISTS (
      SELECT 1 FROM public.tender_meetings tm
      WHERE tm.id = tender_meeting_id
        AND (tm.reporter_id = auth.uid() OR tm.counterpart_id = auth.uid())
    )
  );

-- ── 9. Provider insights uploads (feeds match engine) ───
CREATE TABLE IF NOT EXISTS public.provider_insights_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('past_projects_excel','site_analysis','custom_report')),
  file_url text NOT NULL,
  file_name text,
  description text,
  parsed_json jsonb,
  admin_approved boolean DEFAULT false,
  admin_reviewed_at timestamptz,
  admin_reviewer_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON public.provider_insights_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_approved ON public.provider_insights_uploads(admin_approved) WHERE admin_approved;

ALTER TABLE public.provider_insights_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own insights" ON public.provider_insights_uploads;
CREATE POLICY "Users see own insights"
  ON public.provider_insights_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upload own insights" ON public.provider_insights_uploads;
CREATE POLICY "Users upload own insights"
  ON public.provider_insights_uploads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 10. Extend tenant_documents with classification ─────
ALTER TABLE public.tenant_documents
  ADD COLUMN IF NOT EXISTS classification text
    CHECK (classification IN ('public','project_only','private')) DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS shareable_with_tenants boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contains_sensitive_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.tenant_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plain_language_description text;

CREATE INDEX IF NOT EXISTS idx_tenant_documents_classification ON public.tenant_documents(classification);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_parent ON public.tenant_documents(parent_document_id);

-- ── 11. updated_at trigger helper (idempotent) ──────────
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['architect_profiles','appraiser_profiles','provider_match_preferences','provider_ratings','project_tasks'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END $$;

COMMENT ON TABLE public.architect_profiles IS 'Type-specific profile for architect providers';
COMMENT ON TABLE public.appraiser_profiles IS 'Type-specific profile for appraiser providers';
COMMENT ON TABLE public.provider_match_preferences IS 'Per-provider matching preferences feeding the match engine scoring';
COMMENT ON TABLE public.provider_ratings IS 'External rating links + in-app tenant ratings';
COMMENT ON TABLE public.project_tasks IS 'Project task board / kanban items';
COMMENT ON TABLE public.meeting_date_polls IS 'Multi-option meeting scheduling poll';
COMMENT ON TABLE public.meeting_summaries IS 'Mandatory post-meeting summary upload';
COMMENT ON TABLE public.provider_insights_uploads IS 'Provider-supplied past data that feeds match engine learning';
