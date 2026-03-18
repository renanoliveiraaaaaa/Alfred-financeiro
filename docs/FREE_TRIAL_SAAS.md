# Free Trial SaaS — Alfred Financeiro

Sistema de período de teste gratuito de 7 dias para o modelo SaaS. Implementa um *soft paywall*: ao expirar o trial, o utilizador é redirecionado para uma página dedicada e deve contactar o administrador para estender o acesso.

## Parte 1: Base de Dados (Supabase)

### 1. Executar migrações no SQL Editor do Supabase

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Execute primeiro o ficheiro `supabase/migrations/20260218100000_free_trial_saas.sql`
3. Execute depois o ficheiro `supabase/migrations/20260218100001_update_existing_profiles_trial.sql`

### O que as migrações fazem

- **20260218100000**: Adiciona colunas `plan_status` (default: 'trial') e `trial_ends_at` à tabela `profiles`. Cria trigger que preenche automaticamente `trial_ends_at = NOW() + 7 dias` em novos perfis.
- **20260218100001**: Atualiza perfis existentes com `plan_status='trial'` e `trial_ends_at` daqui a 7 dias.

### Valores de `plan_status`

- `trial` – Período de teste
- `active` – Plano ativo (acesso estendido)
- `expired` – Trial expirado (bloqueado)

## Parte 2: Interface (Next.js)

### Comportamento implementado

1. **Página /expired**: Mensagem clara quando o trial expira. Sem Sidebar nem Topbar.
2. **Bloqueio**: O layout verifica `trial_ends_at` e `plan_status`. Se `plan_status='trial'` e a data atual > `trial_ends_at`, redireciona para `/expired`.
3. **Badge no Topbar**: Exibe "X dias de teste grátis" ou "Último dia de teste" quando falta menos de 1 dia.

### Estender acesso a um utilizador

No Supabase SQL Editor:

```sql
-- Estender trial por mais 7 dias
UPDATE public.profiles
SET trial_ends_at = NOW() + INTERVAL '7 days',
    plan_status = 'trial'
WHERE id = 'UUID_DO_UTILIZADOR';

-- Ou marcar como plano ativo (sem expiração)
UPDATE public.profiles
SET plan_status = 'active',
    trial_ends_at = NULL
WHERE id = 'UUID_DO_UTILIZADOR';
```
