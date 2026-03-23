-- Adiciona 'pix' como método de pagamento aceito em expenses.payment_method
-- O Pix é o meio de pagamento instantâneo mais usado no Brasil.

-- 1. Remove o CHECK constraint existente
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- 2. Recria o CHECK incluindo 'pix'
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN ('credito', 'debito', 'especie', 'credito_parcelado', 'pix'));
