-- RLS org + membership em categories e import_sessions (alinhado a expenses/revenues)

-- -----------------------------------------------------------------------------
-- 1. Backfill residual
-- -----------------------------------------------------------------------------
UPDATE public.import_sessions s
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = s.user_id
  AND o.type = 'personal'
  AND s.organization_id IS NULL;

UPDATE public.categories c
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = c.user_id
  AND o.type = 'personal'
  AND c.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.import_sessions WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem import_sessions sem organization_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.categories WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem categories sem organization_id';
  END IF;
END $$;

ALTER TABLE public.import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_organization_id_fkey;

ALTER TABLE public.import_sessions
  ADD CONSTRAINT import_sessions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.import_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. RLS import_sessions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own import_sessions" ON public.import_sessions;
DROP POLICY IF EXISTS "Users can insert own import_sessions" ON public.import_sessions;
DROP POLICY IF EXISTS "Users can update own import_sessions" ON public.import_sessions;
DROP POLICY IF EXISTS "Users can delete own import_sessions" ON public.import_sessions;

CREATE POLICY "Users can view own org import_sessions" ON public.import_sessions
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = import_sessions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org import_sessions" ON public.import_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = import_sessions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org import_sessions" ON public.import_sessions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = import_sessions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org import_sessions" ON public.import_sessions
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = import_sessions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. RLS categories
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view own org categories" ON public.categories
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = categories.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org categories" ON public.categories
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = categories.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org categories" ON public.categories
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = categories.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org categories" ON public.categories
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = categories.organization_id
        AND om.profile_id = auth.uid()
    )
  );
