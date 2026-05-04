import { unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { formatGeminiCallError, getGeminiApiKey, getGeminiModelId } from '@/lib/geminiEnv'
import {
  auditSubscriptions,
  computeBuyingPower,
  threeMonthWindowEnd,
} from '@/lib/lifestyleFinance'
import {
  getCalendarMonthRange,
  getCurrentCalendarMonth,
  shiftCalendarMonth,
} from '@/lib/monthRange'
import {
  detectExpenseContextMismatch,
  resolveTargetOrganization,
  type UserOrgRef,
} from '@/lib/transactionAuditor'

export type ButlerOrgContext = 'personal' | 'business'

export type ButlerContextConflictItem = {
  transactionId: string
  description: string
  suggestedTargetOrgId: string
  suggestedTargetOrgName: string
}

export type ButlerInsightData = {
  context: ButlerOrgContext
  message: string
  trend: 'up' | 'down' | 'flat'
  /** Despesas do mês com possível contexto trocado (para UI / conciliação) */
  contextConflicts?: ButlerContextConflictItem[]
}

const COOKIE_ORG = 'alfred.activeOrganizationId'

const MORDOMO_SYSTEM_INSTRUCTION = `Você é o Alfred, um mordomo de luxo e consultor financeiro sênior. Analise os dados financeiros do usuário abaixo. Seja formal, use 'Senhor' e forneça um insight curto, analítico e acionável. Diferencie se o contexto é Pessoal ou Business. Considere também o 'Dinheiro Livre' (estilo de vida) e possíveis aumentos em assinaturas para dar o conselho de hoje.

Quando a secção «Suspeitas de contexto» listar despesas que parecem estar na organização errada (Pessoal vs Business), incorpore naturalmente no mesmo parágrafo uma observação acionável: por exemplo, se uma despesa em «Minhas Finanças» parecer custo operacional, diga algo como: «Senhor, notei que a despesa [nome curto] foi registrada em 'Minhas Finanças', mas parece ser um custo operacional. Deseja que eu a mova para a organização Business?» — adapte o nome da organização de destino ao que vier nos dados. Se o gasto parecer pessoal mas estiver no Business, inverta o sentido. Não prometa que moverá sozinho; o utilizador confirma na aplicação. Se não houver suspeitas, ignore este parágrafo extra.`

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
  dinheiroLivreEstiloVida: number
  gastoLazerOutrosMes: number
  limiteConforto: string
  resumoAlertasAssinaturas: string
  /** Texto para o modelo; vazio ou "Nenhuma." */
  suspeitasContexto: string
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
• Dinheiro livre (estilo de vida): ${formatBrl(snapshot.dinheiroLivreEstiloVida)} — após essenciais/contas e compromisso mensal estimado das metas
• Gasto em lazer + outros no mês: ${formatBrl(snapshot.gastoLazerOutrosMes)}
• Limite de conforto (lazer vs. dinheiro livre): ${snapshot.limiteConforto}
• Assinaturas (auditoria): ${snapshot.resumoAlertasAssinaturas}

Suspeitas de contexto (despesas que podem pertencer à outra organização):
${snapshot.suspeitasContexto}

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
  ['alfred-butler-gemini-v2'],
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
        .select('id, amount, category, description, due_date, organization_id')
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

    const win3 = threeMonthWindowEnd(cur.year, cur.month)
    const expenseWindowQuery = () => {
      let q = supabase
        .from('expenses')
        .select('amount, category, description, due_date')
        .eq('user_id', user.id)
        .gte('due_date', win3.start)
        .lte('due_date', win3.end)
      if (expenseOrgFilter) q = q.eq('organization_id', expenseOrgFilter)
      return q
    }

    const goalsQuery = () => {
      let q = supabase
        .from('goals')
        .select('target_amount, current_amount, deadline')
        .eq('user_id', user.id)
      if (expenseOrgFilter) q = q.eq('organization_id', expenseOrgFilter)
      return q
    }

    const subsQuery = () => {
      let q = supabase
        .from('subscriptions')
        .select('id, name, amount, active, created_at')
        .eq('user_id', user.id)
        .eq('active', true)
      if (expenseOrgFilter) q = q.eq('organization_id', expenseOrgFilter)
      return q
    }

    const [curExpRes, prevExpRes, curRevRes, goalsRes, subsRes, expWinRes] = await Promise.all([
      expenseQuery(curRange),
      expenseQuery(prevRange),
      revenueQuery(curRange),
      goalsQuery(),
      subsQuery(),
      expenseWindowQuery(),
    ])

    if (curExpRes.error || prevExpRes.error || curRevRes.error) return null

    const curRows = curExpRes.data ?? []
    const prevRows = prevExpRes.data ?? []
    const revRows = curRevRes.data ?? []
    const goalsRows = goalsRes.error ? [] : (goalsRes.data ?? [])
    const subsRows = subsRes.error ? [] : (subsRes.data ?? [])
    const expWinRows = expWinRes.error ? [] : (expWinRes.data ?? [])

    const sum = (rows: { amount: number | string | null }[]) =>
      rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)

    const currentTotal = sum(curRows)
    const previousTotal = sum(prevRows)
    const totalReceitasMes = sum(revRows)
    const saldoMes = totalReceitasMes - currentTotal

    // Novo utilizador: sem dados ainda — evita chamada desnecessária ao Gemini
    if (currentTotal === 0 && previousTotal === 0 && totalReceitasMes === 0) {
      return {
        context,
        message:
          'Bem-vindo ao Alfred, Senhor. Para que eu possa começar a apoiá-lo com insights financeiros, registe as suas primeiras receitas e despesas do mês.',
        trend: 'flat',
      }
    }

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

    const bp = computeBuyingPower({
      totalRevenues: totalReceitasMes,
      monthExpenses: curRows,
      goals: goalsRows,
      viewYear: cur.year,
      viewMonth1to12: cur.month,
    })

    const subAlerts = auditSubscriptions(subsRows, expWinRows, cur.year, cur.month)
    const resumoAlertasAssinaturas =
      subAlerts.length === 0
        ? 'Nenhum alerta relevante no período.'
        : subAlerts
            .slice(0, 4)
            .map((a) => a.message)
            .join(' ')

    const limiteConforto =
      bp.dinheiroLivre > 0 && bp.lifestyleShareOfFree != null && bp.lifestyleShareOfFree > 0.8
        ? 'Atenção: mais de 80% do dinheiro livre já consumido em lazer/outros.'
        : bp.dinheiroLivre <= 0 && bp.lifestyleSpend > 0
          ? 'Sem margem de dinheiro livre; há gasto em lazer/outros.'
          : 'Dentro do limite de conforto para lazer/outros.'

    const { data: memLinks } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)

    const memberOrgIds = [...new Set(memLinks?.map((m) => m.organization_id) ?? [])]
    const { data: orgRows } =
      memberOrgIds.length > 0
        ? await supabase.from('organizations').select('id, type, name').in('id', memberOrgIds)
        : { data: [] as { id: string; type: string; name: string }[] }

    const userOrgs: UserOrgRef[] = (orgRows ?? []).map((o) => ({
      id: o.id,
      type: o.type as 'personal' | 'business',
      name: (o.name && o.name.trim()) || (o.type === 'personal' ? 'Minhas Finanças' : 'Empresa'),
    }))

    const orgTypeById = new Map<string, 'personal' | 'business'>()
    for (const o of userOrgs) orgTypeById.set(o.id, o.type)

    const contextConflicts: ButlerContextConflictItem[] = []
    const suspicionLines: string[] = []

    for (const row of curRows) {
      const id = (row as { id?: string }).id
      const orgId = String((row as { organization_id?: string }).organization_id ?? '')
      if (!id || !orgId) continue
      const orgType = orgTypeById.get(orgId)
      if (!orgType) continue

      const mismatch = detectExpenseContextMismatch({
        description: String((row as { description?: string }).description ?? ''),
        category: String((row as { category?: string }).category ?? ''),
        organizationType: orgType,
      })
      if (!mismatch) continue
      const target = resolveTargetOrganization(mismatch.suggestedTarget, userOrgs)
      if (!target) continue

      const rawDesc = String((row as { description?: string }).description ?? '').trim() || 'Despesa'
      const rowCtxNome =
        orgType === 'personal' ? '«Minhas Finanças» (Pessoal)' : 'contexto Business'

      contextConflicts.push({
        transactionId: id,
        description: rawDesc.length > 120 ? `${rawDesc.slice(0, 117)}…` : rawDesc,
        suggestedTargetOrgId: target.id,
        suggestedTargetOrgName: target.name,
      })
      suspicionLines.push(
        `— «${rawDesc.slice(0, 70)}${rawDesc.length > 70 ? '…' : ''}» (pistas: ${mismatch.matchedHints.slice(0, 4).join(', ')}) em ${rowCtxNome}; destino sugerido: «${target.name}».`,
      )
    }

    const suspeitasContexto =
      suspicionLines.length > 0
        ? suspicionLines.join('\n')
        : 'Nenhuma suspeita relevante neste mês.'

    const snapshot: ButlerFinanceSnapshot = {
      contextoOrganizacao: context === 'business' ? 'Business' : 'Personal',
      mesReferencia: monthLabelPt(cur.year, cur.month),
      totalGastosMes: currentTotal,
      totalReceitasMes,
      maiorCategoriaGasto: topCategory,
      saldoMes,
      totalGastosMesAnterior: previousTotal,
      dinheiroLivreEstiloVida: bp.dinheiroLivre,
      gastoLazerOutrosMes: bp.lifestyleSpend,
      limiteConforto,
      resumoAlertasAssinaturas,
      suspeitasContexto,
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

    const conflictsPayload =
      contextConflicts.length > 0 ? { contextConflicts } : {}

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return { context, message: fallbackMessage, trend, ...conflictsPayload }
    }

    try {
      const message = await getCachedButlerGeminiMessage(
        user.id,
        orgCacheKey,
        monthKey,
        snapshotJson,
      )
      return { context, message, trend, ...conflictsPayload }
    } catch (err: unknown) {
      console.error('[butlerInsightServer] Gemini:', formatGeminiCallError(err))
      return { context, message: fallbackMessage, trend, ...conflictsPayload }
    }
  } catch {
    return null
  }
}
