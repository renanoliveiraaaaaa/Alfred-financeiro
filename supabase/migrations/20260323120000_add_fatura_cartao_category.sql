-- Adiciona a categoria 'fatura_cartao' (pagamento de fatura de cartão de crédito de terceiros).
-- Cobre saídas da conta corrente referentes ao pagamento de faturas de cartões externos.

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check CHECK (category IN (
    'mercado', 'combustivel', 'manutencao_carro', 'alimentacao',
    'transporte', 'assinaturas', 'saude', 'educacao',
    'lazer', 'moradia', 'compras', 'fatura_cartao', 'outros'
  ));
