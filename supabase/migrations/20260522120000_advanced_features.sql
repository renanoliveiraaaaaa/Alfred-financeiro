-- Locale, tema customizado, log de atividades sensíveis

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pt'
  CHECK (locale IN ('pt', 'en'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_theme JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_select_own ON public.activity_logs;
CREATE POLICY activity_logs_select_own ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS activity_logs_insert_own ON public.activity_logs;
CREATE POLICY activity_logs_insert_own ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
