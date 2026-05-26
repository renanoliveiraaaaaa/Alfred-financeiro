-- Stripe billing: IDs externos e ciclo de faturação no perfil SaaS

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_billing_cycle TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_billing_cycle_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_billing_cycle_check
  CHECK (subscription_billing_cycle IS NULL OR subscription_billing_cycle IN ('monthly', 'yearly'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_unique
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_unique
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID (cus_...)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe Subscription ID (sub_...) ativa ou última conhecida';
COMMENT ON COLUMN public.profiles.subscription_billing_cycle IS 'monthly | yearly — espelho do price Stripe';
