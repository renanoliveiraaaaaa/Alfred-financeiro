# Auditoria de Segurança — Row Level Security (RLS)

## Resumo

Esta auditoria garante que **nenhum dado de um usuário vaze para outro**. Todas as tabelas sensíveis possuem políticas RLS ativas com a regra: `user_id = auth.uid()`.

## Tabelas Protegidas

| Tabela | RLS | Políticas |
|--------|-----|-----------|
| expenses | ✅ | SELECT, INSERT, UPDATE, DELETE |
| revenues | ✅ | SELECT, INSERT, UPDATE, DELETE |
| credit_cards | ✅ | SELECT, INSERT, UPDATE, DELETE |
| categories | ✅ | SELECT, INSERT, UPDATE, DELETE |
| subscriptions | ✅ | SELECT, INSERT, UPDATE, DELETE |
| income_sources | ✅ | SELECT, INSERT, UPDATE, DELETE |
| goals | ✅ | SELECT, INSERT, UPDATE, DELETE |
| projections | ✅ | SELECT, INSERT, UPDATE, DELETE |
| profiles | ✅ | SELECT, INSERT, UPDATE (se existir) |

## Como Aplicar

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo de `supabase/migrations/20260218010000_rls_audit.sql`
3. Execute o script

Ou, se usar Supabase CLI localmente:

```bash
supabase db push
```

## Revisão do Frontend

### Chaves e Credenciais ✅

- **Apenas** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são usadas
- A chave `service_role` **nunca** aparece no código — correta para frontend
- O `anon` key é seguro para o cliente; o RLS garante o isolamento dos dados

### Cliente Supabase ✅

- **Cliente browser** (`lib/supabaseClient.ts`): usa `createBrowserClient` do `@supabase/ssr`, que lê os cookies de sessão automaticamente
- **Cliente server** (`lib/supabaseServer.ts`): usa `createServerClient` com cookies do Next.js — Server Actions e middleware usam a sessão do usuário
- **Middleware**: protege rotas autenticadas (dashboard, expenses, revenues, credit-cards, goals, subscriptions, income-sources, projections, reports, settings, profile, expired) e redireciona não logados para `/`

### Chamadas ao Banco

Todas as operações passam pelo cliente Supabase que carrega a sessão do usuário. O RLS no banco garante que, mesmo que o frontend envie um `user_id` incorreto, o Supabase rejeitará a operação.
