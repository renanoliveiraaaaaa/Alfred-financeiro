-- Add 'liquid' as allowed value for app_theme
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_app_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_theme_check
  CHECK (app_theme IN ('normal', 'gala', 'classic', 'club', 'liquid'));
