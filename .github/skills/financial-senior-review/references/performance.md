# Referência: Performance e Mobile UX

## Performance — Next.js 14 / App Router

### 1. Server Components vs Client Components

Verificar `app/(app)/` para uso desnecessário de `"use client"`:

```typescript
// ❌ Client Component desnecessário (sem interatividade)
'use client'
export default function ExpensesList({ expenses }) {
  return <ul>{expenses.map(e => <li key={e.id}>{e.description}</li>)}</ul>
}

// ✅ Server Component — menor bundle, sem hydration
export default function ExpensesList({ expenses }) {
  return <ul>{expenses.map(e => <li key={e.id}>{e.description}</li>)}</ul>
}
```

**Regra**: `"use client"` apenas quando necessário: `useState`, `useEffect`, event handlers, contextos de browser.

### 2. Fetch Waterfall

```typescript
// ❌ Waterfall: espera cada fetch antes do próximo
const expenses = await getExpenses()
const revenues = await getRevenues()
const goals = await getGoals()

// ✅ Paralelo: todos executam ao mesmo tempo
const [expenses, revenues, goals] = await Promise.all([
  getExpenses(),
  getRevenues(),
  getGoals(),
])
```

Verificar páginas do dashboard que buscam múltiplos recursos.

### 3. Suspense e Loading States

```typescript
// ✅ Streaming com Suspense (app/(app)/dashboard/page.tsx)
export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<Skeleton />}>
        <ExpensesChart /> {/* Server Component assíncrono */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <GoalsPanel />
      </Suspense>
    </>
  )
}
```

Verificar se `loading.tsx` existe em rotas de alta latência.

### 4. Cache de Server Actions / Fetch

```typescript
// ✅ Cache de dados estáticos com revalidação
async function getCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*')
  // Considerar unstable_cache do Next.js para dados raramente alterados
}
```

### 5. Bundle Size

Verificar imports pesados em Client Components:
- `chart.js` — deve ser carregado apenas nas páginas de relatórios/dashboard
- `pdfjs-dist` — deve usar dynamic import com `ssr: false`
- `framer-motion` — verificar se animações simples poderiam ser CSS

```typescript
// ✅ Dynamic import para libs pesadas
const PDFViewer = dynamic(() => import('../components/PDFViewer'), {
  ssr: false,
  loading: () => <Spinner />,
})
```

---

## Mobile UX — Padrões para Finance Apps

### 1. Touch Targets (WCAG 2.5.5)

```css
/* ❌ Target muito pequeno */
.action-btn { width: 24px; height: 24px; }

/* ✅ Mínimo 44×44px */
.action-btn { min-width: 44px; min-height: 44px; }
```

Verificar em:
- `components/BottomNav.tsx` — ícones de navegação
- Botões de ação em listas (excluir, editar)
- Checkboxes e switches em `settings/`

### 2. Safe Area (iOS)

```css
/* ❌ BottomNav sobrepõe a barra home do iPhone */
.bottom-nav { padding-bottom: 0; }

/* ✅ Respeitando safe area */
.bottom-nav { padding-bottom: env(safe-area-inset-bottom); }
```

Verificar `components/BottomNav.tsx` e o layout `app/(app)/layout.tsx`.

### 3. Inputs Financeiros

```tsx
/* ❌ Input genérico — abre teclado QWERTY no mobile */
<input type="text" value={amount} />

/* ✅ Abre teclado numérico com decimais */
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*[.,]?[0-9]*"
  value={amount}
/>
```

Verificar `components/CurrencyInput.tsx` e todos os formulários de receita/despesa.

### 4. Scroll em iOS Safari

```css
/* ❌ overflow-hidden em container pai quebra scroll filho no iOS */
.page-container { overflow: hidden; }

/* ✅ Permitir scroll com bounce nativo */
.page-container { overflow-y: auto; -webkit-overflow-scrolling: touch; }
```

### 5. PWA Manifest

Verificar `public/manifest.json`:
```json
{
  "name": "Finance Manager",
  "short_name": "Finance",
  "display": "standalone",
  "start_url": "/dashboard",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Campos obrigatórios para prompt de instalação:
- `name`, `short_name`, `display: "standalone"`, `start_url`
- Ícone 192×192 e 512×512 (ao menos um `maskable`)

### 6. Feedback Háptico e Visual

Em apps financeiros mobile, ações destrutivas (excluir transação, zerar meta) devem ter:
1. Confirmação visual (`ConfirmDangerModal.tsx` — verificar se está sendo usado consistentemente)
2. Toast de feedback após a ação (`lib/toastContext.tsx`)
3. Estado de loading no botão durante operação assíncrona

### 7. Gestos e Navegação

- Swipe para voltar deve funcionar (não interceptar gestos globalmente)
- `BottomNav` deve destacar a rota ativa corretamente
- Deep links (ex.: notificação → tela de despesa específica) devem funcionar com `start_url` do PWA

### 8. Responsividade

Verificar breakpoints em componentes críticos:
- `components/Sidebar.tsx` — deve ser oculta em mobile (< `lg`)
- `components/Topbar.tsx` — título não deve transbordar em telas pequenas
- Tabelas de dados: verificar se usam scroll horizontal ou cards em mobile
- Modais: verificar se ocupam tela cheia em mobile (`h-full md:h-auto`)
