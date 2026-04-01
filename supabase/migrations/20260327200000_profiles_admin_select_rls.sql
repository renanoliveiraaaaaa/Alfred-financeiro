-- Permite que utilizadores com role = 'admin' consultem todos os perfis (KPIs e CRM).
-- Combina com a política existente "Users can view own profile" (OR entre políticas).

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );
