-- ══════════════════════════════════════════════════════════
-- Migration 013: Architect & Appraiser Form Field Extensions
-- Adds spec fields to public.inspections for richer planning
-- (TBA, building %, density, rights transfer, preservation,
-- recommended project type, tenant-friendly insights, risks)
-- and appraiser fields (tenant compensation, developer profit,
-- feasibility level, market analysis, economic risks).
-- Idempotent — safe to re-run.
-- ══════════════════════════════════════════════════════════

-- ── Architect-side fields ───────────────────────────────
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS tba_status text
    CHECK (tba_status IN ('approved','in_process','expired','none')),
  ADD COLUMN IF NOT EXISTS building_pct_existing numeric(5,2),
  ADD COLUMN IF NOT EXISTS building_pct_proposed numeric(5,2),
  ADD COLUMN IF NOT EXISTS density_units_per_dunam numeric(6,2),
  ADD COLUMN IF NOT EXISTS connects_buildings boolean,
  ADD COLUMN IF NOT EXISTS rights_transfer boolean,
  ADD COLUMN IF NOT EXISTS preservation_required boolean,
  ADD COLUMN IF NOT EXISTS recommended_project_type text
    CHECK (recommended_project_type IN ('pinuy_binuy','tama_38_2','chalufat_shaked','binui_pinui','none')),
  ADD COLUMN IF NOT EXISTS tenant_friendly_insights text,
  ADD COLUMN IF NOT EXISTS planning_risks text;

-- ── Appraiser-side fields ───────────────────────────────
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS tenant_compensation numeric(15,2),
  ADD COLUMN IF NOT EXISTS developer_profit numeric(15,2),
  ADD COLUMN IF NOT EXISTS feasibility_level text
    CHECK (feasibility_level IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS market_analysis text,
  ADD COLUMN IF NOT EXISTS economic_risks text;

COMMENT ON COLUMN public.inspections.tba_status IS 'סטטוס תב"ע';
COMMENT ON COLUMN public.inspections.building_pct_existing IS 'אחוזי בנייה קיימים';
COMMENT ON COLUMN public.inspections.building_pct_proposed IS 'אחוזי בנייה מוצעים';
COMMENT ON COLUMN public.inspections.density_units_per_dunam IS 'צפיפות (יחידות/דונם)';
COMMENT ON COLUMN public.inspections.connects_buildings IS 'האם הפרויקט מחבר מספר בניינים';
COMMENT ON COLUMN public.inspections.rights_transfer IS 'ניוד זכויות בנייה';
COMMENT ON COLUMN public.inspections.preservation_required IS 'האם נדרש שימור מבנה';
COMMENT ON COLUMN public.inspections.recommended_project_type IS 'סוג הפרויקט המומלץ (פינוי בינוי / תמ"א 38/2 / חלופת שקד / בינוי פינוי)';
COMMENT ON COLUMN public.inspections.tenant_friendly_insights IS 'תובנות בשפה פשוטה לדיירים';
COMMENT ON COLUMN public.inspections.planning_risks IS 'סיכונים תכנוניים';
COMMENT ON COLUMN public.inspections.tenant_compensation IS 'תמורות כספיות לדיירים';
COMMENT ON COLUMN public.inspections.developer_profit IS 'רווח יזמי משוער';
COMMENT ON COLUMN public.inspections.feasibility_level IS 'רמת כדאיות: low/medium/high';
COMMENT ON COLUMN public.inspections.market_analysis IS 'ניתוח שוק';
COMMENT ON COLUMN public.inspections.economic_risks IS 'סיכונים כלכליים';
