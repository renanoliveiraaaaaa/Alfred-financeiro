-- Criação de org Business pelo cliente: dono vê a org antes de existir membership,
-- e pode inserir a própria linha em organization_members.

DROP POLICY IF EXISTS "Owners can view organizations they own" ON public.organizations;
CREATE POLICY "Owners can view organizations they own" ON public.organizations
  FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can insert self as organization member" ON public.organization_members;
CREATE POLICY "Owners can insert self as organization member" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
CREATE POLICY "Owners can delete their organizations" ON public.organizations
  FOR DELETE
  USING (auth.uid() = owner_id);
