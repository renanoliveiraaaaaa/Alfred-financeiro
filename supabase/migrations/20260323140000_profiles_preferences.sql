-- Adiciona preferências persistentes ao perfil do usuário:
-- hide_balance: ocultar saldos ao abrir o app
-- weekly_report: receber resumo semanal por e-mail

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_balance BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN NOT NULL DEFAULT FALSE;
