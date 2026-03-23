-- Adiciona a categoria 'compras' (compras online / marketplaces) à restrição de category em expenses.
-- Cobre: Mercado Livre, Shopee, Amazon, AliExpress, Magazine Luiza, Americanas, Shein, etc.

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check CHECK (category IN (
    'mercado', 'combustivel', 'manutencao_carro', 'alimentacao',
    'transporte', 'assinaturas', 'saude', 'educacao',
    'lazer', 'moradia', 'compras', 'outros'
  ));
