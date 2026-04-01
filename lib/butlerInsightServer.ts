import { unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { formatGeminiCallError, getGeminiApiKey, getGeminiModelId } from '@/lib/geminiEnv'
import {
  getCalendarMonthRange,
  getCurrentCalendarMonth,
  shiftCalendarMonth,
} from '@/lib/monthRange'

export type ButlerOrgContext = 'personal' | 'business'

export type ButlerInsightData = {
  context: ButlerOrgContext
  message: string
  trend: 'up' | 'down' | 'flat'
}

const COOKIE_ORG = 'alfred.activeOrganizationId'

const MORDOMO_SYSTEM_INSTRUCTION = `Você é o Alfred, um mordomo de luxo e consultor financeiro sênior. Analise os dados financeiros do usuário abaixo. Seja formal, use 'Senhor' e forneça um insight curto, analítico e acionável. Diferencie se o contexto é Pessoal ou Business.`

const CACHE_TAG = 'alfred-butler-gemini'
const CACHE_REVALIDATE_SECONDS = 86_400 // 24 h

type ButlerFinanceSnapshot = {
  contextoOrganizacao: 'Personal' | 'Business'
  mesReferencia: string
  totalGastosMes: number
  totalReceitasMes: number
  maiorCategoriaGasto: string
  saldoMes: number
  totalGastosMesAnterior: number
}

function formatCategoryLabel(raw: string): string {
  const t = raw.trim()
  if (!t) return 'Geral'
  return t
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function monthLabelPt(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
}

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function buildMessage(params: {
  context: ButlerOrgContext
  trend: 'up' | 'down' | 'flat'
  pct: number
  topCategory: string
  current: number
  previous: number
}): string {
  const { context, trend, pct, topCategory } = params
  const pctAbs = Math.min(999, Math.abs(Math.round(pct * 10) / 10))

  if (trend === 'flat') {
    if (context === 'business') {
      return `Senhor, o volume de despesas manteve-se alinhado com o mês anterior no fluxo de caixa. Sugiro monitorizar a rubrica «${topCategory}» para proteger a margem de lucro.`
    }
    return `Senhor, as suas despesas na economia doméstica mantiveram-se estáveis face ao mês anterior. Continuamos vigilantes na categoria «${topCategory}».`
  }

  if (trend === 'up') {
    if (context === 'business') {
      return `Senhor, registo um aumento de ${pctAbs}% nas despesas operacionais este mês, com impacto no fluxo de caixa e na margem de lucro. Recomendo rever a rubrica «${topCategory}» com a equipa financeira.`
    }
    return `Senhor, notei um aumento de ${pctAbs}% nas despesas este mês na sua economia doméstica. Recomendo revisar a categoria «${topCategory}» para mantermos o plano de saúde financeira.`
  }

  if (context === 'business') {
    return `Excelente desempenho, Senhor. As despesas empresariais recuaram ${pctAbs}%, o que favorece a margem de lucro e o fluxo de caixa. Deseja alocar este excedente na sua meta de «Reserva de Emergência»?`
  }
  return `Excelente desempenho, Senhor. As suas despesas na economia doméstica reduziram ${pctAbs}%. Deseja alocar este excedente na sua meta de «Reserva de Emergência»?`
}

function buildUserPrompt(snapshot: ButlerFinanceSnapshot): string {
  return `Resumo financeiro do mês atual (${snapshot.mesReferencia}):

• Contexto da organização ativa: ${snapshot.contextoOrganizacao}
• Total de gastos (despesas) no mês: ${formatBrl(snapshot.totalGastosMes)}
• Total de receitas no mês: ${formatBrl(snapshot.totalReceitasMes)}
• Maior categoria de gasto: ${snapshot.maiorCategoriaGasto}
• Saldo do mês (receitas − gastos): ${formatBrl(snapshot.saldoMes)}
• Total de gastos no mês anterior (referência): ${formatBrl(snapshot.totalGastosMesAnterior)}

Redija um único parágrafo com o conselho ao Senhor, sem listas numeradas e sem repetir integralmente os números acima, salvo se for essencial à recomendação.`
}

async function generateButlerInsightWithGemini(snapshot: ButlerFinanceSnapshot): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('Chave GOOGLE_GEMINI_API_KEY / GEMINI_API_KEY não configurada.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: getGeminiModelId(),
    systemInstruction: MORDOMO_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 512,
    },
  })

  const result = await model.generateContent(buildUserPrompt(snapshot))
  const text = result.response.text().trim()
  if (!text) {
    throw new Error('Resposta vazia do Gemini.')
  }
  return text
}

/**
 * Cache de 24 h por utilizador, âmbito de org, mês civil e snapshot dos totais.
 * Evita chamadas repetidas ao Gemini em refreshes da página; alteração material dos dados gera novo snapshot JSON e nova chave de cache.
 */
const getCachedButlerGeminiMessage = unstable_cache(
  async (userId: string, orgKey: string, monthKey: string, snapshotJson: string) => {
    const snapshot = JSON.parse(snapshotJson) as ButlerFinanceSnapshot
    return generateButlerInsightWithGemini(snapshot)
  },
  ['alfred-butler-gemini-v1'],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
)

export async function getButlerInsightData(): Promise<ButlerInsightData | null> {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const cookieStore = cookies()
    const cookieOrgId = cookieStore.get(COOKIE_ORG)?.value?.trim() || null

    let context: ButlerOrgContext = 'personal'
    let expenseOrgFilter: string | null = null

    if (cookieOrgId) {
      const { data: mem } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .eq('organization_id', cookieOrgId)
        .maybeSingle()

      if (mem) {
        expenseOrgFilter = cookieOrgId
        const { data: org } = await supabase
          .from('organizations')
          .select('type')
          .eq('id', cookieOrgId)
          .maybeSingle()
        if (org?.type === 'business') context = 'business'
        else context = 'personal'
      }
    }

    const cur = getCurrentCalendarMonth()
    const prev = shiftCalendarMonth(cur.year, cur.month, -1)
    const curRange = getCalendarMonthRange(cur.year, cur.month)
    const prevRange = getCalendarMonthRange(prev.year, prev.month)

    const expenseQuery = (range: { start: string; end: string }) => {
      let q = supabase
        .from('expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('due_date', range.start)
        .lte('due_date', range.end)
      if (expenseOrgFilter) q = q.eq('organization_id', expenseOrgFilter)
      return q
    }

    const revenueQuery = (range: { start: string; end: string }) => {
      let q = supabase
        .from('revenues')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', range.start)
        .lte('date', range.end)
      if (expenseOrgFilter) q = q.eq('organization_id', expenseOrgFilter)
      return q
    }

    const [curExpRes, prevExpRes, curRevRes] = await Promise.all([
      expenseQuery(curRange),
      expenseQuery(prevRange),
      revenueQuery(curRange),
    ])

    if (curExpRes.error || prevExpRes.error || curRevRes.error) return null

    const curRows = curExpRes.data ?? []
    const prevRows = prevExpRes.data ?? []
    const revRows = curRevRes.data ?? []

    const sum = (rows: { amount: number | string | null }[]) =>
      rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)

    const currentTotal = sum(curRows)
    const previousTotal = sum(prevRows)
    const totalReceitasMes = sum(revRows)
    const saldoMes = totalReceitasMes - currentTotal

    const byCat = new Map<string, number>()
    for (const row of curRows) {
      const cat = (row.category && String(row.category).trim()) || 'outros'
      byCat.set(cat, (byCat.get(cat) ?? 0) + Number(row.amount ?? 0))
    }
    let topCategory = 'Outros'
    let topAmt = -1
    for (const [cat, amt] of byCat) {
      if (amt > topAmt) {
        topAmt = amt
        topCategory = formatCategoryLabel(cat)
      }
    }
    if (topAmt <= 0) topCategory = 'Geral'

    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (previousTotal <= 0 && currentTotal <= 0) {
      trend = 'flat'
    } else if (previousTotal <= 0 && currentTotal > 0) {
      trend = 'up'
    } else if (currentTotal > previousTotal * 1.0001) {
      trend = 'up'
    } else if (currentTotal < previousTotal * 0.9999 && previousTotal > 0) {
      trend = 'down'
    } else {
      trend = 'flat'
    }

    const pct =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : currentTotal > 0
          ? 100
          : 0

    const snapshot: ButlerFinanceSnapshot = {
      contextoOrganizacao: context === 'business' ? 'Business' : 'Personal',
      mesReferencia: monthLabelPt(cur.year, cur.month),
      totalGastosMes: currentTotal,
      totalReceitasMes,
      maiorCategoriaGasto: topCategory,
      saldoMes,
      totalGastosMesAnterior: previousTotal,
    }

    const monthKey = `${cur.year}-${String(cur.month).padStart(2, '0')}`
    const orgCacheKey = expenseOrgFilter ?? 'all-orgs-visible'
    const snapshotJson = JSON.stringify(snapshot)

    const fallbackMessage = buildMessage({
      context,
      trend,
      pct,
      topCategory,
      current: currentTotal,
      previous: previousTotal,
    })

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return { context, message: fallbackMessage, trend }
    }

    try {
      const message = await getCachedButlerGeminiMessage(
        user.id,
        orgCacheKey,
        monthKey,
        snapshotJson,
      )
      return { context, message, trend }
    } catch (err: unknown) {
      console.error('[butlerInsightServer] Gemini:', formatGeminiCallError(err))
      return { context, message: fallbackMessage, trend }
    }
  } catch {
    return null
  }
}
