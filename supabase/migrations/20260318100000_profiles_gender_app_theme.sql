-- =============================================================================
-- PROFILES: gender e app_theme
-- Adiciona colunas para personalização de tratamento e tematização
-- Execute no Supabase SQL Editor ou via: supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Adicionar colunas à tabela profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('M', 'F', 'O'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_theme TEXT NOT NULL DEFAULT 'normal'
    CHECK (app_theme IN ('normal', 'alfred'));

-- -----------------------------------------------------------------------------
-- 2. Atualizar trigger handle_new_user para incluir gender
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, gender, app_theme)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'gender'), ''), 'O'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'app_theme'), ''), 'normal')
  )
  ON CONFLICT (id) DO UPDATE SET
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    app_theme = COALESCE(EXCLUDED.app_theme, profiles.app_theme);
  RETURN NEW;
END;
$$;
