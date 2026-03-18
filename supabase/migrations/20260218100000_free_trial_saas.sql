-- =============================================================================
-- FREE TRIAL SaaS - Alfred Financeiro
-- Adiciona colunas plan_status e trial_ends_at à tabela profiles
-- Trigger para novos utilizadores: trial_ends_at = NOW() + 7 dias
-- Execute no Supabase SQL Editor ou via: supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Adicionar colunas à tabela profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan_status IN ('trial', 'active', 'expired'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2. Função e trigger para novos perfis
-- Ao inserir um novo perfil, preenche trial_ends_at com NOW() + 7 dias
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se trial_ends_at não foi fornecido, define como daqui a 7 dias
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;
  -- Garante plan_status como trial para novos registos
  IF NEW.plan_status IS NULL OR NEW.plan_status = '' THEN
    NEW.plan_status := 'trial';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_trial_ends_at_on_profile_insert ON public.profiles;
CREATE TRIGGER set_trial_ends_at_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_trial();

-- -----------------------------------------------------------------------------
-- NOTA: Se o projeto usa trigger em auth.users para criar profile (handle_new_user),
-- o trigger BEFORE INSERT em profiles acima garantirá que trial_ends_at e
-- plan_status sejam preenchidos automaticamente em qualquer inserção.
-- -----------------------------------------------------------------------------
