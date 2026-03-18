-- =============================================================================
-- AUDITORIA RLS - Alfred Financeiro
-- Garante que cada usuário só acesse seus próprios dados (user_id = auth.uid())
-- Execute no Supabase SQL Editor ou via: supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CREDIT_CARDS
-- -----------------------------------------------------------------------------
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit_cards" ON public.credit_cards;
CREATE POLICY "Users can view own credit_cards" ON public.credit_cards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit_cards" ON public.credit_cards;
CREATE POLICY "Users can insert own credit_cards" ON public.credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credit_cards" ON public.credit_cards;
CREATE POLICY "Users can update own credit_cards" ON public.credit_cards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own credit_cards" ON public.credit_cards;
CREATE POLICY "Users can delete own credit_cards" ON public.credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- GOALS
-- -----------------------------------------------------------------------------
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- EXPENSES (reforçar se já existir)
-- -----------------------------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- REVENUES
-- -----------------------------------------------------------------------------
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own revenues" ON public.revenues;
CREATE POLICY "Users can view own revenues" ON public.revenues
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own revenues" ON public.revenues;
CREATE POLICY "Users can insert own revenues" ON public.revenues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own revenues" ON public.revenues;
CREATE POLICY "Users can update own revenues" ON public.revenues
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own revenues" ON public.revenues;
CREATE POLICY "Users can delete own revenues" ON public.revenues
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- CATEGORIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SUBSCRIPTIONS (já feito acima)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- INCOME_SOURCES
-- -----------------------------------------------------------------------------
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own income_sources" ON public.income_sources;
CREATE POLICY "Users can view own income_sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own income_sources" ON public.income_sources;
CREATE POLICY "Users can insert own income_sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own income_sources" ON public.income_sources;
CREATE POLICY "Users can update own income_sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own income_sources" ON public.income_sources;
CREATE POLICY "Users can delete own income_sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- GOALS (já feito acima)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- PROJECTIONS
-- -----------------------------------------------------------------------------
ALTER TABLE public.projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projections" ON public.projections;
CREATE POLICY "Users can view own projections" ON public.projections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projections" ON public.projections;
CREATE POLICY "Users can insert own projections" ON public.projections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projections" ON public.projections;
CREATE POLICY "Users can update own projections" ON public.projections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projections" ON public.projections;
CREATE POLICY "Users can delete own projections" ON public.projections
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- PROFILES (se existir - extensão do auth.users)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles';
    EXECUTE 'CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles';
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;
