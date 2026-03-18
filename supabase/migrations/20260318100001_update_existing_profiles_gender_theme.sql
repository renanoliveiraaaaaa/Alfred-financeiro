-- =============================================================================
-- ATUALIZAR PERFIS EXISTENTES - gender e app_theme
-- Define gender='M' e app_theme='normal' para evitar erros na interface
-- Execute após a migração 20260318100000
-- =============================================================================

UPDATE public.profiles
SET
  gender = COALESCE(NULLIF(TRIM(gender), ''), 'M'),
  app_theme = COALESCE(NULLIF(TRIM(app_theme), ''), 'normal')
WHERE gender IS NULL
   OR gender NOT IN ('M', 'F', 'O')
   OR app_theme IS NULL
   OR app_theme NOT IN ('normal', 'alfred');
