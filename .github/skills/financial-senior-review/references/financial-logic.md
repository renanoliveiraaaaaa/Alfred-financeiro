# Referência: Lógica Financeira e Dados

## Princípios Fundamentais de Sistemas Financeiros

> **Regra de ouro:** Dinheiro não é float. Nunca.

### 1. Representação Monetária

```typescript
// ❌ Float — erros de arredondamento acumulam
const total = 0.1 + 0.2 // 0.30000000000000004
const split = 100.0 / 3  // 33.33333333333333 → perde centavos

// ✅ Centavos (inteiros) — sem perda de precisão
const totalCents = 10 + 20  // 30 centavos = R$ 0,30
const splitCents = Math.floor(10000 / 3) // 3333 centavos = R$ 33,33

// ✅ Ou usar toFixed(2) + parseFloat apenas na exibição, nunca em cálculos
const display = (amountCents / 100).toFixed(2)
```

Verificar `lib/format.ts` — como os valores são formatados e se há risco de float.
Verificar `components/CurrencyInput.tsx` — como o input converte para o tipo armazenado.

### 2. Cálculo de Parcelas (`lib/installments.ts`)

```typescript
// Verificar:
// 1. Número total de parcelas > 0 (sem divisão por zero)
// 2. Parcela atual <= total de parcelas
// 3. Soma das parcelas == valor total (sem perda por arredondamento)

// ✅ Distribuição correta de centavos em parcelas
function splitInInstallments(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents % count
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? base + remainder : base // primeira parcela absorve o resto
  )
}
```

### 3. Datas e Fusos Horários

Este é o bug mais comum em sistemas financeiros brasileiros:

```typescript
// ❌ new Date('2024-01-15') é UTC → no Brasil (UTC-3) vira 2024-01-14 às 21:00
const date = new Date('2024-01-15') // ERRADO para datas de vencimento

// ✅ Usar string de data (YYYY-MM-DD) sem converter para Date quando desnecessário
const dueDate = '2024-01-15' // armazenar como string no banco (tipo date do Postgres)

// ✅ Quando precisar de Date local
const [year, month, day] = '2024-01-15'.split('-').map(Number)
const localDate = new Date(year, month - 1, day) // sem UTC
```

**Pontos a verificar:**
- `lib/monthRange.ts` — como mês atual é calculado (usar `new Date()` pode ter problema no fuso)
- Filtros de data em `lib/actions/expenses.ts` — `gte`/`lte` com datas corretas
- Vencimento de cartão de crédito — dia do mês preservado corretamente

### 4. Detecção de Duplicatas (`lib/transactionDuplicates.ts`)

```typescript
// Algoritmo mínimo de deduplicação para extratos bancários:
// 1. Mesmo valor (em centavos)
// 2. Mesma data (± 1 dia de tolerância para horário de corte)
// 3. Descrição similar (distância de Levenshtein ou normalização de texto)

// Verificar se o threshold é configurável ou muito rígido/frouxo
// Verificar se importações repetidas do mesmo arquivo são bloqueadas
```

**Verificar `lib/transactionDuplicates.ts` e `app/(app)/import-statement/`**

### 5. Metas Financeiras (`app/(app)/goals/`)

```typescript
// Verificar:
const progress = (currentAmount / targetAmount) * 100

// ❌ Sem cap — pode mostrar 150% se o usuário ultrapassar a meta
<ProgressBar value={progress} />

// ✅ Com cap visual e estado especial
const displayProgress = Math.min(progress, 100)
const isCompleted = progress >= 100
<ProgressBar value={displayProgress} completed={isCompleted} />
```

### 6. Categorização Automática com IA (`lib/auto-categorize.ts`)

- Verificar se o fallback existe quando a API do Gemini falha ou retorna categorias inválidas
- Verificar se há timeout configurado para a chamada da IA (não bloquear importação indefinidamente)
- Verificar se categorias retornadas pela IA são validadas contra as categorias existentes no banco

```typescript
// ✅ Fallback robusto
async function autoCategorizе(description: string): Promise<string> {
  try {
    const category = await geminiCategorize(description)
    return validCategories.includes(category) ? category : 'outros'
  } catch {
    return 'outros' // nunca deixar importação falhar por erro de IA
  }
}
```

### 7. Projeções e Butler Insight (`lib/butlerInsightServer.ts`, `lib/lifestyleFinance.ts`)

- Verificar se projeções com dados insuficientes (< 1 mês de histórico) têm aviso ao usuário
- Verificar se `NaN` e `Infinity` são tratados antes de exibir valores calculados
- Verificar se o "butler insight" usa dados reais do período ou dados mockados em fallback

```typescript
// ✅ Proteção contra divisão por zero em projeções
const monthlyAvg = totalMonths > 0 ? totalExpenses / totalMonths : 0
const burnRate = income > 0 ? expenses / income : 1 // 100% se não há renda cadastrada
```

### 8. Assinaturas / Subscriptions (`app/(app)/subscriptions/`)

- Verificar se o ciclo de cobrança (mensal, anual) é representado corretamente
- Verificar se a data de renovação é calculada corretamente para meses de 28/29/30/31 dias
- Verificar se assinaturas canceladas são removidas do cálculo de custo recorrente mensal

### 9. Importação de Extratos PDF (`lib/parsers/`)

```typescript
// Verificar em cada parser:
// 1. Valores negativos (débitos) vs positivos (créditos) identificados corretamente
// 2. Datas no formato DD/MM/YYYY convertidas corretamente
// 3. Descrições truncadas ou com caracteres especiais tratadas
// 4. Limites de tamanho de arquivo verificados antes do parse
// 5. PDFs com proteção por senha tratados com erro claro ao usuário

// ❌ Sem validação de tamanho
const text = await parseBuffer(buffer) // pode travar com PDF de 100MB

// ✅ Verificar tamanho antes
if (buffer.length > 10 * 1024 * 1024) { // 10MB
  throw new Error('Arquivo muito grande. Máximo: 10MB')
}
```

### 10. Auditor de Transações (`lib/transactionAuditor.ts`)

Verificar quais anomalias são detectadas:
- Despesas com valor zero ou negativo
- Despesas no futuro distante (> 30 dias)
- Categorias inválidas ou nulas
- Transações sem data

Verificar se o auditor bloqueia ou apenas alerta (comportamento esperado: alertar, não bloquear).
