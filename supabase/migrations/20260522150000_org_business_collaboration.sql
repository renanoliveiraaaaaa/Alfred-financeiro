-- Colaboração org business: RLS partilhado + convites + helpers SECURITY DEFINER

-- -----------------------------------------------------------------------------
-- 1. Helpers (bypass RLS; evitam recursão em organization_members)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.type = 'business'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(p_org_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.profile_id = auth.uid()
      AND om.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_org_row(p_org_id uuid, p_row_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(p_org_id)
    AND (
      public.is_business_org(p_org_id)
      OR p_row_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_mutate_org_row(p_org_id uuid, p_row_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(p_org_id)
    AND (
      p_row_user_id = auth.uid()
      OR (
        public.is_business_org(p_org_id)
        AND public.has_org_role(p_org_id, ARRAY['owner', 'admin'])
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_org_row(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_mutate_org_row(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_organization_ids() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_org_row(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mutate_org_row(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_organization_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. RLS dados financeiros — business: SELECT partilhado; mutate autor ou admin/owner
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'expenses', 'revenues', 'subscriptions', 'credit_cards', 'goals',
    'income_sources', 'projections', 'import_sessions', 'categories'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own org %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own org %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own org %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own org %I" ON public.%I', t, t);

    EXECUTE format($sql$
      CREATE POLICY "Users can view own org %1$I" ON public.%1$I
        FOR SELECT
        USING (public.can_view_org_row(organization_id, user_id))
    $sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Users can insert own org %1$I" ON public.%1$I
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND public.is_org_member(organization_id)
        )
    $sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Users can update own org %1$I" ON public.%1$I
        FOR UPDATE
        USING (public.can_mutate_org_row(organization_id, user_id))
        WITH CHECK (public.can_mutate_org_row(organization_id, user_id))
    $sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Users can delete own org %1$I" ON public.%1$I
        FOR DELETE
        USING (public.can_mutate_org_row(organization_id, user_id))
    $sql$, t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. organization_members — ver colegas; remover membros (não owners)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view co-members in shared orgs" ON public.organization_members;
CREATE POLICY "Members can view co-members in shared orgs" ON public.organization_members
  FOR SELECT
  USING (organization_id IN (SELECT public.current_user_organization_ids()));

DROP POLICY IF EXISTS "Owners can remove org members" ON public.organization_members;
CREATE POLICY "Owners can remove org members" ON public.organization_members
  FOR DELETE
  USING (
    public.has_org_role(organization_id, ARRAY['owner', 'admin'])
    AND role <> 'owner'
    AND profile_id <> auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 4. profiles — nome dos colegas na equipa
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view co-member profiles" ON public.profiles;
CREATE POLICY "Members can view co-member profiles" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om_self
      INNER JOIN public.organization_members om_peer
        ON om_self.organization_id = om_peer.organization_id
      WHERE om_self.profile_id = auth.uid()
        AND om_peer.profile_id = profiles.id
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Convites
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_invites_token_unique UNIQUE (token)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_pending_email
  ON public.organization_invites (organization_id, lower(trim(email)))
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organization_invites_org_id
  ON public.organization_invites (organization_id);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can view invites" ON public.organization_invites;
CREATE POLICY "Org admins can view invites" ON public.organization_invites
  FOR SELECT
  USING (
    public.has_org_role(organization_id, ARRAY['owner', 'admin'])
    AND public.is_business_org(organization_id)
  );

DROP POLICY IF EXISTS "Org admins can create invites" ON public.organization_invites;
CREATE POLICY "Org admins can create invites" ON public.organization_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_org_role(organization_id, ARRAY['owner', 'admin'])
    AND public.is_business_org(organization_id)
  );

DROP POLICY IF EXISTS "Org admins can delete invites" ON public.organization_invites;
CREATE POLICY "Org admins can delete invites" ON public.organization_invites
  FOR DELETE
  USING (
    public.has_org_role(organization_id, ARRAY['owner', 'admin'])
    AND public.is_business_org(organization_id)
  );

-- -----------------------------------------------------------------------------
-- 6. Aceitar convite (RPC)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'invite_auth_required';
  END IF;

  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'invite_no_email';
  END IF;

  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  IF NOT public.is_business_org(v_invite.organization_id) THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  IF lower(trim(v_invite.email)) <> v_email THEN
    RAISE EXCEPTION 'invite_email_mismatch';
  END IF;

  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role)
  ON CONFLICT (organization_id, profile_id)
  DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.organization_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN v_invite.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(uuid) TO authenticated;

COMMENT ON FUNCTION public.accept_organization_invite(uuid) IS
  'Aceita convite por token; exige e-mail JWT igual ao convite.';
