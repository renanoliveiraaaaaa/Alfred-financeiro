# Referência: Qualidade de Código TypeScript / Next.js

## 1. TypeScript Rigoroso

### Uso de `any`

```typescript
// ❌ any apaga a proteção de tipos
async function saveExpense(data: any) { ... }
set(name: string, value: string, options: any) { ... } // comum no supabase client

// ✅ Tipar com o tipo correto ou com ResponseCookie do Next.js
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
set(name: string, value: string, options: Partial<ResponseCookie>) { ... }
```

**Buscar por:** `grep "any" lib/actions/ lib/supabaseClient.ts lib/supabaseServer.ts`

### Retorno de Server Actions

```typescript
// ✅ Tipo de retorno consistente e explícito
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function createExpense(input: CreateExpenseInput): Promise<ActionResult<Expense>> {
  // ...
}

// ❌ Retorno inconsistente — dificulta tratamento no cliente
export async function createExpense(input) {
  if (error) throw new Error(...)   // às vezes lança
  return data                        // às vezes retorna dado direto
  // às vezes retorna { error: string }
}
```

### Tipos do Supabase

Verificar `types/supabase.ts` — se está atualizado com o schema atual.
Deve ser gerado com: `npx supabase gen types typescript --linked > types/supabase.ts`

```typescript
// ✅ Usar tipos gerados em vez de definir manualmente
import type { Database } from '@/types/supabase'
type Expense = Database['public']['Tables']['expenses']['Row']
```

## 2. Padrões Next.js App Router

### Separação Client/Server

Verificar se há mistura de código server-only em Client Components:

```typescript
// ❌ Importar supabaseServer em Client Component
'use client'
import { createSupabaseServerClient } from '@/lib/supabaseServer' // vai quebrar no runtime

// ✅ Client Component chama Server Action
'use client'
import { createExpense } from '@/lib/actions/expenses' // Server Action
```

### Metadata de Páginas

```typescript
// ✅ Cada page.tsx deve ter metadata (SEO e PWA)
export const metadata: Metadata = {
  title: 'Dashboard | Finance Manager',
  description: 'Visão geral das suas finanças',
}
```

Verificar se páginas internas têm metadata definido (especialmente para PWA standalone).

### Error Boundaries

```tsx
// app/(app)/error.tsx — verificar se existe e trata o erro adequadamente
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Algo deu errado</h2>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  )
}
```

## 3. Contextos React

### Re-renders Desnecessários

```typescript
// Verificar lib/toastContext.tsx, lib/privacyContext.tsx, lib/userPreferencesContext.tsx

// ❌ Novo objeto a cada render — todos os consumidores re-renderizam
const value = { user, setUser } // objeto novo a cada render

// ✅ Memoizar o valor do contexto
const value = useMemo(() => ({ user, setUser }), [user])
```

### Organização de Providers

Verificar `components/Providers.tsx` — se providers desnecessários envolvem toda a árvore.

## 4. Componentes Grandes (> 300 linhas)

Identificar componentes candidatos a refatoração:

```bash
# Buscar arquivos tsx com muitas linhas
find app/ components/ -name "*.tsx" | xargs wc -l | sort -n | tail -20
```

Componentes grandes são sinais de:
- Múltiplas responsabilidades (violar SRP)
- Dificuldade de teste
- Re-renders excessivos

## 5. Console.log em Produção

```bash
# Buscar console.log que não sejam console.error
grep -r "console\.log" lib/ app/ components/ --include="*.ts" --include="*.tsx"
```

Em produção, apenas `console.error` e `console.warn` são aceitáveis.
Usar serviço de logging estruturado para erros críticos.

## 6. Dependências Desatualizadas ou com Vulnerabilidades

```bash
npm audit
npm outdated
```

Verificar especialmente:
- `@supabase/ssr` e `@supabase/supabase-js` — versões recentes têm fixes de segurança
- `next` — patches de segurança frequentes
- `pdf-parse` — dependência pesada, verificar se `pdfjs-dist` pode substituí-la completamente

## 7. Tratamento de Erros em Promises

```typescript
// ❌ Promise não tratada — erros silenciosos
useEffect(() => {
  fetchExpenses() // se rejeitar, nada acontece
}, [])

// ✅ Tratamento explícito
useEffect(() => {
  fetchExpenses().catch(err => {
    console.error('Erro ao carregar despesas:', err)
    setError('Não foi possível carregar as despesas.')
  })
}, [])
```

## 8. Importações e Organização

```typescript
// ✅ Ordem de importações (por convenção Next.js)
// 1. React e Next
import { useState } from 'react'
import Link from 'next/link'
// 2. Bibliotecas externas
import { motion } from 'framer-motion'
// 3. Aliases internos (@/)
import { formatCurrency } from '@/lib/format'
// 4. Componentes relativos
import { ExpenseCard } from './ExpenseCard'
```

Verificar se o projeto tem regra de lint para ordem de imports (`import/order`).

## 9. Acessibilidade Básica (a11y)

```tsx
// ❌ Botão sem label acessível
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// ✅ Label para leitores de tela
<button onClick={handleDelete} aria-label="Excluir despesa">
  <TrashIcon aria-hidden="true" />
</button>
```

Verificar especialmente:
- Ícones de ação sem texto visível
- Inputs sem `<label>` associado (ou `aria-label`)
- Modais sem `role="dialog"` e `aria-modal="true"`

## 10. Verificação de Erros de Compilação

Após qualquer auditoria que resulte em correções:
1. Executar `npm run build` para verificar erros de TypeScript e Next.js
2. Executar `npm run lint` para verificar regras do ESLint
3. Usar `get_errors` no VS Code para verificar erros em tempo real
