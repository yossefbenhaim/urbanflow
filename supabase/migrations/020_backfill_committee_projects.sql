-- ══════════════════════════════════════════════════════════
-- Migration 020: Backfill projects for already-elected ועד reps
-- Prior to auto-provisioning, some tenants became reps manually but
-- their buildings have no project. For each such rep, create the
-- project (manager_id = rep) and bulk-join every tenant of the
-- building into project_tenants. Idempotent — re-runs are safe.
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  new_project uuid;
  display_addr text;
BEGIN
  FOR r IN
    SELECT p.id AS rep_id, p.representative_building_id AS bid, b.address, b.city, b.project_id
    FROM public.profiles p
    JOIN public.buildings b ON b.id = p.representative_building_id
    WHERE p.is_building_representative = true
      AND b.project_id IS NULL
  LOOP
    display_addr := COALESCE(NULLIF(r.address, ''), NULLIF(r.city, ''), 'בניין');
    INSERT INTO public.projects (name, type, status, manager_id, organizer_id, building_ids, address)
    VALUES (
      'פרויקט ' || display_addr,
      'PINUY_BINUY',
      'INITIAL',
      r.rep_id,
      r.rep_id,
      ARRAY[r.bid],
      r.address
    )
    RETURNING id INTO new_project;

    UPDATE public.buildings SET project_id = new_project WHERE id = r.bid;

    INSERT INTO public.project_tenants (project_id, tenant_id, status)
    SELECT new_project, tp.user_id, 'active'
    FROM public.tenant_profiles tp
    WHERE tp.building_id = r.bid AND tp.user_id IS NOT NULL
    ON CONFLICT (project_id, tenant_id) DO NOTHING;

    RAISE NOTICE 'Backfilled project % for rep % at building %', new_project, r.rep_id, r.bid;
  END LOOP;
END $$;

-- Also backfill project_tenants for projects that already existed (e.g.
-- via manual provisionProjectForBuilding) but never had tenants joined.
INSERT INTO public.project_tenants (project_id, tenant_id, status)
SELECT p.id, tp.user_id, 'active'
FROM public.projects p
JOIN unnest(p.building_ids) AS bid(bid) ON true
JOIN public.tenant_profiles tp ON tp.building_id = bid.bid
WHERE tp.user_id IS NOT NULL
ON CONFLICT (project_id, tenant_id) DO NOTHING;
