-- Migration: Import Statements Feature
-- Adds import_sessions table and source/import_session_id columns to revenues and expenses

-- =============================================
-- TABELA DE SESSÕES DE IMPORTAÇÃO
-- (deve vir antes das colunas FK em revenues/expenses)
-- =============================================

CREATE TABLE IF NOT EXISTS public.import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  bank TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  imported_transactions INTEGER DEFAULT 0,
  skipped_transactions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COLUNAS NOVAS EM REVENUES E EXPENSES
-- =============================================

ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES public.import_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES public.import_sessions(id) ON DELETE SET NULL;

-- =============================================
-- RLS para import_sessions
-- =============================================

ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import_sessions"
  ON public.import_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import_sessions"
  ON public.import_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import_sessions"
  ON public.import_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own import_sessions"
  ON public.import_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_revenues_source ON public.revenues(source);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON public.expenses(source);
CREATE INDEX IF NOT EXISTS idx_import_sessions_user_id ON public.import_sessions(user_id);
