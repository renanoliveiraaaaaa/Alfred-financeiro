-- Tabela de fontes de renda recorrente
CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('mensal', 'quinzenal', 'semanal')),
  next_receipt_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON public.income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_next_receipt ON public.income_sources(next_receipt_date);

ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own income_sources" ON public.income_sources;
CREATE POLICY "Users can view own income_sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own income_sources" ON public.income_sources;
CREATE POLICY "Users can insert own income_sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own income_sources" ON public.income_sources;
CREATE POLICY "Users can update own income_sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own income_sources" ON public.income_sources;
CREATE POLICY "Users can delete own income_sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);
