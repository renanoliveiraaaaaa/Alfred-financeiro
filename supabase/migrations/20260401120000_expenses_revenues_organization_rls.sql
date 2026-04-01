-- Multi-tenant: organization_id em expenses/revenues + RLS (membro da org)

-- -----------------------------------------------------------------------------
-- 1. Colunas (nullable até ao backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses (organization_id);
CREATE INDEX IF NOT EXISTS idx_revenues_organization_id ON public.revenues (organization_id);

-- -----------------------------------------------------------------------------
-- 2. Backfill: org pessoal do dono da linha
-- -----------------------------------------------------------------------------
UPDATE public.expenses e
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = e.user_id
  AND o.type = 'personal'
  AND e.organization_id IS NULL;

UPDATE public.revenues r
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = r.user_id
  AND o.type = 'personal'
  AND r.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.expenses WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem expenses sem organization_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.revenues WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: existem revenues sem organization_id';
  END IF;
END $$;

ALTER TABLE public.expenses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.revenues ALTER COLUMN organization_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. RLS expenses: substituir políticas só-user_id por user_id + membership
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own org expenses" ON public.expenses
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = expenses.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org expenses" ON public.expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = expenses.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org expenses" ON public.expenses
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = expenses.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = expenses.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org expenses" ON public.expenses
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = expenses.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RLS revenues
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can insert own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON public.revenues;

CREATE POLICY "Users can view own org revenues" ON public.revenues
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = revenues.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org revenues" ON public.revenues
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = revenues.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org revenues" ON public.revenues
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = revenues.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = revenues.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org revenues" ON public.revenues
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = revenues.organization_id
        AND om.profile_id = auth.uid()
    )
  );
