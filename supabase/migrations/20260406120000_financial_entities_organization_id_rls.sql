-- Multi-tenant: organization_id em subscriptions, credit_cards, goals, income_sources
-- + RLS alinhado a expenses/revenues (membro da organização).

-- -----------------------------------------------------------------------------
-- 1. Colunas e índices
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.income_sources
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_organization_id ON public.credit_cards (organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_organization_id ON public.goals (organization_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_organization_id ON public.income_sources (organization_id);

-- -----------------------------------------------------------------------------
-- 2. Backfill: org pessoal do dono da linha
-- -----------------------------------------------------------------------------
UPDATE public.subscriptions s
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = s.user_id
  AND o.type = 'personal'
  AND s.organization_id IS NULL;

UPDATE public.credit_cards c
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = c.user_id
  AND o.type = 'personal'
  AND c.organization_id IS NULL;

UPDATE public.goals g
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = g.user_id
  AND o.type = 'personal'
  AND g.organization_id IS NULL;

UPDATE public.income_sources i
SET organization_id = o.id
FROM public.organizations o
WHERE o.owner_id = i.user_id
  AND o.type = 'personal'
  AND i.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: subscriptions sem organization_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.credit_cards WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: credit_cards sem organization_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.goals WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: goals sem organization_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.income_sources WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: income_sources sem organization_id';
  END IF;
END $$;

ALTER TABLE public.subscriptions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.credit_cards ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.goals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.income_sources ALTER COLUMN organization_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. RLS subscriptions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own org subscriptions" ON public.subscriptions
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = subscriptions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org subscriptions" ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = subscriptions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = subscriptions.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = subscriptions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org subscriptions" ON public.subscriptions
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = subscriptions.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RLS credit_cards
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can insert own credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can update own credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can delete own credit_cards" ON public.credit_cards;

CREATE POLICY "Users can view own org credit_cards" ON public.credit_cards
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = credit_cards.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org credit_cards" ON public.credit_cards
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = credit_cards.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org credit_cards" ON public.credit_cards
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = credit_cards.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = credit_cards.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org credit_cards" ON public.credit_cards
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = credit_cards.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. RLS goals
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can view own org goals" ON public.goals
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = goals.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org goals" ON public.goals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = goals.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org goals" ON public.goals
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = goals.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = goals.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org goals" ON public.goals
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = goals.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 6. RLS income_sources
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own income_sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can insert own income_sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can update own income_sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can delete own income_sources" ON public.income_sources;

CREATE POLICY "Users can view own org income_sources" ON public.income_sources
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = income_sources.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org income_sources" ON public.income_sources
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = income_sources.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org income_sources" ON public.income_sources
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = income_sources.organization_id
        AND om.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = income_sources.organization_id
        AND om.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org income_sources" ON public.income_sources
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = income_sources.organization_id
        AND om.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7. Admin: políticas de leitura global (mantêm is_app_admin; nomes idênticos aos anteriores)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all credit_cards" ON public.credit_cards;
CREATE POLICY "Admins can view all credit_cards" ON public.credit_cards
  FOR SELECT
  USING (public.is_app_admin());
