-- -----------------------------------------------------------------------------
-- RLS: eliminar recursão em public.profiles (e políticas que consultam profiles)
-- -----------------------------------------------------------------------------
-- Problema: políticas como "Admins can update all profiles" faziam
--   EXISTS (SELECT 1 FROM public.profiles ... role = 'admin')
-- durante UPDATE/SELECT em profiles, voltando a avaliar RLS em profiles →
-- "infinite recursion detected in policy for relation profiles".
--
-- Solução: função STABLE SECURITY DEFINER que lê profiles com privilégios do
-- dono da função (bypass RLS). Todas as políticas usam public.is_app_admin().
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_app_admin() IS
  'True se o utilizador autenticado tem role admin em profiles. Usar em RLS para evitar subconsultas recursivas à própria tabela profiles.';

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO service_role;

-- -----------------------------------------------------------------------------
-- public.profiles
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE
  USING (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- Outras tabelas que verificavam admin via SELECT em profiles (mesma recursão
-- quando o admin acede a profiles ou quando o planner avalia em cadeia)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
CREATE POLICY "Admins can view all expenses" ON public.expenses
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all revenues" ON public.revenues;
CREATE POLICY "Admins can view all revenues" ON public.revenues
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all credit_cards" ON public.credit_cards;
CREATE POLICY "Admins can view all credit_cards" ON public.credit_cards
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all import_sessions" ON public.import_sessions;
CREATE POLICY "Admins can view all import_sessions" ON public.import_sessions
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
CREATE POLICY "Admins can view all organizations" ON public.organizations
  FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all organization_members" ON public.organization_members;
CREATE POLICY "Admins can view all organization_members" ON public.organization_members
  FOR SELECT
  USING (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- RPC admin: mesma verificação sem depender de RLS em profiles dentro da função
-- -----------------------------------------------------------------------------
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
  IF NOT public.is_app_admin() THEN
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

-- -----------------------------------------------------------------------------
-- Storage: bucket avatars (upload de foto de perfil)
-- -----------------------------------------------------------------------------
-- Garante bucket público para leitura por URL; utilizador grava só em {uid}/*
-- Admin pode gerir qualquer objeto no bucket.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket já existente: garantir leitura pública por URL (getPublicUrl)
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_insert_admin" ON storage.objects;
CREATE POLICY "avatars_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND public.is_app_admin());

DROP POLICY IF EXISTS "avatars_update_admin" ON storage.objects;
CREATE POLICY "avatars_update_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND public.is_app_admin())
  WITH CHECK (bucket_id = 'avatars' AND public.is_app_admin());

DROP POLICY IF EXISTS "avatars_delete_admin" ON storage.objects;
CREATE POLICY "avatars_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND public.is_app_admin());
