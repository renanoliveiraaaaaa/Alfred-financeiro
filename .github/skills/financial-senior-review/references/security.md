# Referência: Segurança e RLS

## Checklist de Auditoria de Segurança

### 1. Server Actions (`lib/actions/*.ts`)

Para cada arquivo em `lib/actions/`, verificar:

```typescript
// ✅ Padrão correto
export async function someAction(input: SomeType) {
  const supabase = await createSupabaseServerClient() // SSR client
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }
  // ... operação
}

// ❌ Padrão inseguro: não valida sessão
export async function someAction(input: SomeType) {
  const supabase = createBrowserClient(...) // nunca em Server Action
  // ... operação sem verificar user
}
```

**Pontos a verificar:**
- `createSupabaseServerClient` (SSR) usado, não `supabaseClient` (browser)
- `getUser()` chamado antes de qualquer operação no banco
- `organization_id` validado contra o `user.id` para evitar IDOR
- Dados de entrada validados (tipo, tamanho, formato) antes de usar em queries

### 2. API Routes (`app/api/`)

```typescript
// ✅ Verificação de sessão em API Route
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// ❌ Verificação apenas de header custom (bypassável)
export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.INTERNAL_KEY) return new Response('Forbidden', { status: 403 })
}
```

**Pontos a verificar:**
- Cron jobs (`app/api/cron/`) protegidos com `CRON_SECRET` no header
- `parse-statement` não processa arquivos sem sessão válida
- Tamanho máximo de upload verificado antes de processar PDF

### 3. Variáveis de Ambiente

Procurar por `NEXT_PUBLIC_` em `lib/`:
```bash
# ❌ Nunca expor segredos como NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=...  # CRÍTICO: exposição da service key
NEXT_PUBLIC_GEMINI_API_KEY=...        # CRÍTICO: exposição de chave de API

# ✅ Correto
SUPABASE_SERVICE_ROLE_KEY=...         # server-only
GEMINI_API_KEY=...                    # server-only
```

Verificar `lib/geminiEnv.ts` e `lib/egideEnv.ts` para validar quais chaves são usadas.

### 4. Row Level Security (RLS)

Verificar `SUPABASE_SCHEMA.sql` e `supabase/migrations/`:

```sql
-- ✅ Toda tabela de dados de usuário deve ter RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_expenses" ON expenses
  USING (auth.uid() = user_id);

-- ❌ Tabela sem política ou com policy permissiva
CREATE POLICY "allow_all" ON expenses USING (true); -- CRÍTICO
```

**Tabelas que DEVEM ter RLS:**
- `expenses`, `revenues`, `credit_cards`, `goals`, `subscriptions`
- `income_sources`, `transactions`, `organizations`, `user_profiles`
- Qualquer tabela com `user_id` ou `organization_id`

**Tabelas que podem ser públicas:**
- `categories` (se for lookup table global)
- `plans` (tabela de planos SaaS)

### 5. Middleware de Autenticação (`middleware.ts`)

Verificar:
- Rotas `/admin` exigem validação de papel (role) server-side, não apenas client-side
- Redirecionamento de `/login` após autenticação é para URL relativa (evitar open redirect)
- `matcher` do middleware exclui apenas o necessário (`/_next/static`, `/_next/image`, etc.)

```typescript
// ❌ Open redirect — nunca redirecionar para URL externa do parâmetro
const redirectTo = searchParams.get('next') || '/'
return redirect(redirectTo) // se next='https://evil.com', redireciona externamente

// ✅ Validar que é rota interna
const next = searchParams.get('next') || '/'
const safeNext = next.startsWith('/') ? next : '/'
return redirect(safeNext)
```

### 6. Exposição de Dados Sensíveis

- Verificar se `console.log` em Server Actions imprime dados financeiros ou PII
- Verificar se respostas de API incluem campos desnecessários (ex.: retornar objeto completo do usuário)
- Verificar se erros internos do Supabase são expostos diretamente ao cliente

```typescript
// ❌ Expõe detalhes internos
return { error: supabaseError.message } // pode vazar schema info

// ✅ Mensagem genérica com log interno
console.error('[action] Erro ao salvar despesa:', supabaseError)
return { error: 'Erro ao salvar. Tente novamente.' }
```
