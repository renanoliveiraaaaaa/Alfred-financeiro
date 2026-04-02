-- Reforço: admins com SELECT global (telemetria) após evoluções de RLS + assinaturas da app
-- Idempotente: DROP IF EXISTS + CREATE

-- -----------------------------------------------------------------------------
-- subscriptions (tabela de assinaturas do app — não confundir com Stripe)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- Reafirmar telemetria (garante que existem após migrações de organization_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
CREATE POLICY "Admins can view all expenses" ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all revenues" ON public.revenues;
CREATE POLICY "Admins can view all revenues" ON public.revenues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all credit_cards" ON public.credit_cards;
CREATE POLICY "Admins can view all credit_cards" ON public.credit_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all import_sessions" ON public.import_sessions;
CREATE POLICY "Admins can view all import_sessions" ON public.import_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );
