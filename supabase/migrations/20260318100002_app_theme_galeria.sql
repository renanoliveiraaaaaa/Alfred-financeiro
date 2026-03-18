-- =============================================================================
-- GALERIA DE TEMAS - app_theme expandido para 4 opções
-- normal | gala | classic | club
-- Migra 'alfred' existente para 'classic' (equivalente visual)
-- =============================================================================

-- 1. Migrar perfis com tema alfred para classic
UPDATE public.profiles
SET app_theme = 'classic'
WHERE app_theme = 'alfred';

-- 2. Remover constraint antiga (nome típico do Postgres)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_app_theme_check;

-- 3. Adicionar nova constraint com os 4 temas
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_theme_check
  CHECK (app_theme IN ('normal', 'gala', 'classic', 'club'));
