import { createSupabaseServerClient } from '@/lib/supabaseServer'
import AdminActivitySection, {
  type DailySignup,
} from '@/components/admin/AdminActivitySection'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Percent,
  Receipt,
  Wallet,
  CreditCard,
  Paperclip,
  Banknote,
} from 'lucide-react'

const PREMIUM_MRR_UNIT_BRL = 19.9
const BUSINESS_MRR_UNIT_BRL = 49.9

function buildLast30DaysBuckets(): DailySignup[] {
  const out: DailySignup[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const dateKey = d.toISOString().slice(0, 10)
    out.push({
      dateKey,
      label: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(d),
      count: 0,
    })
  }
  return out
}

function fillDailySignups(
  buckets: DailySignup[],
  rows: { created_at: string }[] | null,
): DailySignup[] {
  const map = new Map(buckets.map((b) => [b.dateKey, { ...b }]))
  for (const row of rows ?? []) {
    const key = row.created_at.slice(0, 10)
    const cur = map.get(key)
    if (cur) cur.count += 1
  }
  return buckets.map((b) => map.get(b.dateKey) ?? b)
}

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient()

  const weekAgo = new Date()
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  const weekAgoIso = weekAgo.toISOString()
  const thirtyAgo = new Date()
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 30)
  const thirtyAgoIso = thirtyAgo.toISOString()

  const buckets = buildLast30DaysBuckets()

  const [
    { count: totalUsers, error: errTotal },
    { count: newThisWeek, error: errWeek },
    { count: adminCount, error: errAdmin },
    { count: withName, error: errNamed },
    { count: totalExpenses, error: errExp },
    { count: totalRevenues, error: errRev },
    { count: totalCards, error: errCards },
    { count: withInvoice, error: errInv },
    { count: importSessions, error: errImport },
    { data: profiles30, error: errProf30 },
    { data: latestFive, error: errLatest },
    { count: premiumPaying, error: errPrem },
    { count: businessPaying, error: errBus },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoIso),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('full_name', 'is', null)
      .neq('full_name', ''),
    supabase.from('expenses').select('*', { count: 'exact', head: true }),
    supabase.from('revenues').select('*', { count: 'exact', head: true }),
    supabase.from('credit_cards').select('*', { count: 'exact', head: true }),
    supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .not('invoice_url', 'is', null)
      .neq('invoice_url', ''),
    supabase.from('import_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('created_at').gte('created_at', thirtyAgoIso),
    supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'premium')
      .in('subscription_status', ['active', 'trial']),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'business')
      .in('subscription_status', ['active', 'trial']),
  ])

  const total = totalUsers ?? 0
  const adoptionPct =
    total > 0 && withName != null ? Math.round((withName / total) * 1000) / 10 : null

  const attachmentCount = errInv ? null : (withInvoice ?? 0)
  const importCount = errImport ? null : (importSessions ?? 0)
  const dataVolumeTotal =
    attachmentCount !== null && importCount !== null
      ? attachmentCount + importCount
      : attachmentCount !== null
        ? attachmentCount
        : importCount !== null
          ? importCount
          : null
  const dataVolumeSubtitle =
    attachmentCount !== null && importCount !== null
      ? `${attachmentCount} faturas anexadas · ${importCount} importações`
      : attachmentCount !== null
        ? `${attachmentCount} faturas anexadas (importações indisponíveis)`
        : importCount !== null
          ? `${importCount} importações (anexos indisponíveis)`
          : 'Anexos em despesas + sessões de importação'

  const kpisUsers = [
    {
      title: 'Total de Usuários',
      value: errTotal ? '—' : (totalUsers ?? '—'),
      subtitle: 'Registos em profiles',
      Icon: Users,
    },
    {
      title: 'Novos esta semana',
      value: errWeek ? '—' : (newThisWeek ?? '—'),
      subtitle: 'Criados nos últimos 7 dias',
      Icon: UserPlus,
    },
    {
      title: 'Administradores',
      value: errAdmin ? '—' : (adminCount ?? '—'),
      subtitle: 'Contas com role admin',
      Icon: ShieldCheck,
    },
    {
      title: 'Taxa de adoção',
      value: errNamed || errTotal ? '—' : adoptionPct != null ? `${adoptionPct}%` : '—',
      subtitle: 'Perfis com nome preenchido / total',
      Icon: Percent,
    },
  ]

  const kpisTelemetry = [
    {
      title: 'Despesas cadastradas',
      value: errExp ? '—' : (totalExpenses ?? '—'),
      subtitle: 'Linhas na tabela expenses (todos os utilizadores)',
      Icon: Receipt,
    },
    {
      title: 'Receitas cadastradas',
      value: errRev ? '—' : (totalRevenues ?? '—'),
      subtitle: 'Linhas na tabela revenues (todos os utilizadores)',
      Icon: Wallet,
    },
    {
      title: 'Cartões de crédito',
      value: errCards ? '—' : (totalCards ?? '—'),
      subtitle: 'Registos em credit_cards',
      Icon: CreditCard,
    },
    {
      title: 'Volume de dados (estim.)',
      value: dataVolumeTotal ?? '—',
      subtitle: dataVolumeSubtitle,
      Icon: Paperclip,
    },
  ]

  const dailySignups = errProf30 ? buckets : fillDailySignups(buckets, profiles30 ?? [])
  const latestUsers = latestFive ?? []

  const nPremium = errPrem ? 0 : (premiumPaying ?? 0)
  const nBusiness = errBus ? 0 : (businessPaying ?? 0)
  const mrrEstimate = nPremium * PREMIUM_MRR_UNIT_BRL + nBusiness * BUSINESS_MRR_UNIT_BRL
  const mrrFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(mrrEstimate)

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
        Visão Geral do Sistema
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Indicadores globais de todas as contas (sem filtro de organização do app cliente).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisUsers.map(({ title, value, subtitle, Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{title}</p>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-base font-semibold text-slate-800">Uso do sistema</h2>
      <p className="mt-1 text-sm text-slate-500">
        Totais globais de transações, cartões e ficheiros referenciados na base de dados.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisTelemetry.map(({ title, value, subtitle, Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{title}</p>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-base font-semibold text-slate-800">Monetização (estimativa)</h2>
      <p className="mt-1 text-sm text-slate-500">
        MRR fictício: soma sobre todos os perfis com plano premium ou business em trial ou ativo.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm ring-1 ring-emerald-900/5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-emerald-900">Receita estimada (MRR)</p>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Banknote className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-emerald-950">
            {mrrFormatted}
          </p>
          <p className="mt-1 text-xs text-emerald-800/90">
            {nPremium} premium × {PREMIUM_MRR_UNIT_BRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + {nBusiness}{' '}
            business × {BUSINESS_MRR_UNIT_BRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {!errLatest && !errProf30 ? (
        <AdminActivitySection dailySignups={dailySignups} latestUsers={latestUsers} />
      ) : (
        <p className="mt-8 text-sm text-slate-500">
          Não foi possível carregar a secção de atividade recente.
        </p>
      )}
    </div>
  )
}
