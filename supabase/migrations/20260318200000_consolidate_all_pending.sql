-- ============================================================
-- MIGRATION CONSOLIDADA — aplica todas as alterações pendentes
-- Execute este arquivo no Supabase SQL Editor caso as migrations
-- individuais ainda não tenham sido rodadas.
-- É seguro rodar múltiplas vezes (todas as operações são idempotentes).
-- ============================================================


-- ── 1. Método de pagamento: adicionar 'pix' ──────────────────
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN ('credito', 'debito', 'especie', 'credito_parcelado', 'pix'));


-- ── 2. Categorias: adicionar 'compras', 'fatura_cartao' e renomear 'manutencao_carro' → 'veiculo' ──

-- 2a. Migra registros existentes antes de alterar o constraint
UPDATE public.expenses
  SET category = 'veiculo'
  WHERE category = 'manutencao_carro';

-- 2b. Recria o CHECK com todos os valores novos
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check CHECK (category IN (
    'mercado', 'alimentacao', 'compras', 'transporte',
    'combustivel', 'veiculo', 'assinaturas', 'saude',
    'educacao', 'lazer', 'moradia', 'fatura_cartao', 'outros'
  ));


-- ── 3. Perfil: colunas de preferências do usuário ───────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_balance BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN NOT NULL DEFAULT FALSE;


-- ── 4. Coluna gender no perfil (se ainda não existir) ────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));


-- ── 5. Coluna app_theme no perfil (se ainda não existir) ─────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_theme TEXT DEFAULT 'default'
  CHECK (app_theme IN ('default', 'dark', 'glass', 'liquid'));
