-- Telemetria no painel admin: leitura global de expenses, revenues, credit_cards e import_sessions
-- + função agregadora por utilizador (evita carregar todas as linhas no browser).

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

CREATE OR REPLACE FUNCTION public.admin_user_activity_totals()
RETURNS TABLE (
  user_id uuid,
  expense_count bigint,
  revenue_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    (SELECT COUNT(*)::bigint FROM public.expenses e WHERE e.user_id = p.id),
    (SELECT COUNT(*)::bigint FROM public.revenues r WHERE r.user_id = p.id)
  FROM public.profiles p;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_activity_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_activity_totals() TO authenticated;
