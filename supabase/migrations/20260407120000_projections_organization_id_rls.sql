-- Multi-tenant: organization_id em projections + RLS (membro da org)

-- -----------------------------------------------------------------------------
-- 1. Remover UNIQUE antigo (user_id, month) antes de adicionar org
-- -----------------------------------------------------------------------------
ALTER TABLE public.projections DROP CONSTRAINT IF EXISTS projections_user_id_month_key;

-- -----------------------------------------------------------------------------
-- 2. Coluna (nullable até ao backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE public.projections
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_projections_organization_id ON public.projections (organization_id);

-- -----------------------------------------------------------------------------
-- 3. Backfill: organização pessoal do dono da linha
-- -----------------------------------------------------------------------------
UPDATE public.projections p
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = p.user_id
  AND o.type = 'personal'
  AND p.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projections WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem projections sem organization_id';
  END IF;
END $$;

ALTER TABLE public.projections ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projections_user_id_organization_id_month_key'
  ) THEN
    ALTER TABLE public.projections
      ADD CONSTRAINT projections_user_id_organization_id_month_key UNIQUE (user_id, organization_id, month);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. RLS: substituir políticas só-user_id por user_id + membership
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own projections" ON public.projections;
DROP POLICY IF EXISTS "Users can insert own projections" ON public.projections;
DROP POLICY IF EXISTS "Users can update own projections" ON public.projections;
DROP POLICY IF EXISTS "Users can delete own projections" ON public.projections;

CREATE POLICY "Users can view own org projections" ON public.projections
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projections.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org projections" ON public.projections
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projections.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org projections" ON public.projections
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projections.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projections.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org projections" ON public.projections
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projections.organization_id
        AND om.profile_id = auth.uid()
    )
  );
