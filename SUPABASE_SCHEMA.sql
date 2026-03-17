-- Schema do Banco de Dados para o Finance Manager
-- Execute este SQL no Supabase SQL Editor

-- Tabela de usuários (já existe no Supabase Auth, mas podemos criar uma tabela adicional se necessário)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de receitas
CREATE TABLE IF NOT EXISTS public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  expected_date DATE,
  received BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mercado', 'combustivel', 'manutencao_carro', 'outros')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credito', 'debito', 'especie', 'credito_parcelado')),
  installments INTEGER,
  installment_number INTEGER,
  due_date DATE,
  paid BOOLEAN DEFAULT FALSE,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de categorias personalizadas
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- Tabela de projeções
CREATE TABLE IF NOT EXISTS public.projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  projected_expenses NUMERIC(10, 2) DEFAULT 0,
  projected_revenues NUMERIC(10, 2) DEFAULT 0,
  actual_expenses NUMERIC(10, 2) DEFAULT 0,
  actual_revenues NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON public.revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON public.revenues(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON public.expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_projections_user_id ON public.projections(user_id);
CREATE INDEX IF NOT EXISTS idx_projections_month ON public.projections(month);

-- Habilitar Row Level Security (RLS) em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS para revenues
CREATE POLICY "Users can view own revenues" ON public.revenues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own revenues" ON public.revenues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own revenues" ON public.revenues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own revenues" ON public.revenues
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para expenses
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para projections
CREATE POLICY "Users can view own projections" ON public.projections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projections" ON public.projections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projections" ON public.projections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projections" ON public.projections
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de fontes de renda recorrente (income_sources)
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

CREATE POLICY "Users can view own income_sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income_sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income_sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income_sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);
