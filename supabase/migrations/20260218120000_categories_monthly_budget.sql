-- =============================================================================
-- Orçamentos por Categoria - Alfred Financeiro
-- Adiciona coluna monthly_budget na tabela categories
-- Execute no Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12, 2) DEFAULT 0;
