-- Renomeia a categoria 'manutencao_carro' para 'veiculo'.
-- Passa a cobrir: manutenção, seguro, consórcio, financiamento, IPVA, multas, etc.

-- 1. Migrar registros existentes
UPDATE public.expenses
  SET category = 'veiculo'
  WHERE category = 'manutencao_carro';

-- 2. Recriar CHECK constraint com o novo valor
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check CHECK (category IN (
    'mercado', 'alimentacao', 'compras', 'transporte',
    'combustivel', 'veiculo', 'assinaturas', 'saude',
    'educacao', 'lazer', 'moradia', 'fatura_cartao', 'outros'
  ));
