# Stripe — Alfred — Assistente Financeiro

Pagamentos recorrentes (Premium / Business) com checkout na `/expired` e portal de gestão em Settings.

## Preços sugeridos (referência UI)

| Plano | Mensal | Anual |
|-------|--------|-------|
| Premium | R$ 39,90 | R$ 399,00 |
| Business | R$ 89,90 | R$ 899,00 |

**Alterar preços depois:** no Stripe Dashboard crie **novos Price IDs** (não edite preços antigos com subscrições ativas) e atualize as variáveis `STRIPE_PRICE_*` na Vercel. A UI em `lib/billing/plans.ts` pode ser ajustada para exibição.

## 1. Stripe Dashboard

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Products**
2. Criar produto **Alfred Premium** com preços recorrentes BRL:
   - Mensal R$ 39,90
   - Anual R$ 399,00
3. Criar produto **Alfred Business**:
   - Mensal R$ 89,90
   - Anual R$ 899,00
4. Copiar cada **Price ID** (`price_...`)

## 2. Webhook

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://alfred-financeiro.vercel.app/api/stripe/webhook`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiar **Signing secret** (`whsec_...`)

## 3. Customer Portal

1. **Settings → Billing → Customer portal** → ativar
2. Permitir cancelamento e atualização de método de pagamento

## 4. Variáveis de ambiente

```env
STRIPE_SECRET_KEY=sk_live_...          # ou sk_test_... em dev
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...

NEXT_PUBLIC_APP_URL=https://alfred-financeiro.vercel.app
```

Na Vercel: Production + Preview (test keys em preview).

## 5. Migration Supabase

Executar no SQL Editor:

`supabase/migrations/20260522170000_stripe_billing.sql`

Colunas: `stripe_customer_id`, `stripe_subscription_id`, `subscription_billing_cycle`.

## 6. Fluxo

1. Trial expira → `/expired` com cartões Premium/Business
2. Checkout Stripe → webhook atualiza `profiles`:
   - `plan_status = active`
   - `subscription_status = active`
   - `subscription_plan = premium | business`
3. Utilizador acede ao dashboard
4. Settings → **Gerir assinatura** (portal Stripe)

## 7. Teste local

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use chaves `sk_test_` e cartão `4242 4242 4242 4242`.

## 8. Admin MRR

O dashboard admin estima MRR com R$ 39,90 (Premium) e R$ 89,90 (Business) para contas `subscription_status = active`.
