-- Multi-tenant: organizações, membros, assinatura SaaS no perfil
-- Cada novo perfil recebe uma organização "personal" + membership como owner.

-- -----------------------------------------------------------------------------
-- 1. Colunas de assinatura em profiles (monetização / planos)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IN ('free', 'premium', 'business'));

-- Sincronizar com plan_status legado (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_status'
  ) THEN
    UPDATE public.profiles
    SET
      subscription_status = CASE plan_status
        WHEN 'active' THEN 'active'
        WHEN 'expired' THEN 'canceled'
        ELSE 'trial'
      END,
      subscription_plan = CASE plan_status
        WHEN 'active' THEN 'premium'
        ELSE subscription_plan
      END;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Tabelas organizations e organization_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_one_personal_per_owner
  ON public.organizations (owner_id)
  WHERE type = 'personal';

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_profile_id ON public.organization_members (profile_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations (owner_id);

-- -----------------------------------------------------------------------------
-- 3. Trigger: novo perfil → organização pessoal + membro owner
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_personal_organization_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_slug text;
BEGIN
  org_slug := 'personal-' || NEW.id::text;

  INSERT INTO public.organizations (owner_id, name, slug, type)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.full_name), ''), 'Minhas Finanças'),
    org_slug,
    'personal'
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, profile_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_create_personal_org ON public.profiles;
CREATE TRIGGER trg_profiles_create_personal_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_personal_organization_for_profile();

-- -----------------------------------------------------------------------------
-- 4. Retrocesso: perfis sem membership (bases antigas)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
BEGIN
  FOR r IN
    SELECT id, full_name FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om WHERE om.profile_id = p.id
    )
  LOOP
    INSERT INTO public.organizations (owner_id, name, slug, type)
    VALUES (
      r.id,
      COALESCE(NULLIF(trim(r.full_name), ''), 'Minhas Finanças'),
      'personal-' || r.id::text,
      'personal'
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (new_org_id, r.id, 'owner');
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view organizations they belong to" ON public.organizations;
CREATE POLICY "Members can view organizations they belong to" ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert owned organizations" ON public.organizations;
CREATE POLICY "Users can insert owned organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members can view own membership rows" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view co-members in same org" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view organization_members in their orgs" ON public.organization_members;

-- Sem subconsulta à mesma tabela (evita recursão RLS).
CREATE POLICY "Members can view own membership rows" ON public.organization_members
  FOR SELECT
  USING (profile_id = auth.uid());

-- Duas políticas SELECT são OR: utilizador vê linhas onde é ele OU colegas de org
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
CREATE POLICY "Admins can view all organizations" ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all organization_members" ON public.organization_members;
CREATE POLICY "Admins can view all organization_members" ON public.organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles ap
      WHERE ap.id = auth.uid() AND ap.role = 'admin'
    )
  );
