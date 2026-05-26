-- profiles.created_at (admin users/dashboard ordenam por data de registo)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE u.id = p.id
  AND p.created_at IS NULL;

UPDATE public.profiles
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
