-- =============================================================================
-- ATUALIZAR PERFIS EXISTENTES - Free Trial
-- Define plan_status='trial' e trial_ends_at=NOW()+7 dias para contas atuais
-- Execute no Supabase SQL Editor após a migração 20260218100000
-- =============================================================================

-- Perfis sem trial_ends_at ou com trial já expirado: renovar por 7 dias
UPDATE public.profiles
SET
  plan_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days'
WHERE trial_ends_at IS NULL
   OR (plan_status = 'trial' AND trial_ends_at < NOW());
