import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'
import { getCalendarMonthRange } from '@/lib/monthRange'
import { threeMonthWindowEnd } from '@/lib/lifestyleFinance'
import type { Database } from '@/types/supabase'

type ViewMonth = { year: number; month: number }

type Revenue = Database['public']['Tables']['revenues']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type Subscription = Database['public']['Tables']['subscriptions']['Row']
type IncomeSource = Database['public']['Tables']['income_sources']['Row']
type Goal = Database['public']['Tables']['goals']['Row']

export type DashboardMovement = {
  id: string
  type: 'revenue' | 'expense'
  description: string
  amount: number
  date: string
  statusKey: 'received' | 'pending' | 'paid' | 'open'
}

export type DashboardPayload = {
  totalRevenues: number
  totalExpenses: number
  projectedExpenses: number
  movements: DashboardMovement[]
  unpaid: Expense[]
  dueSubs: Subscription[]
  dueIncomeSources: IncomeSource[]
  goals: Goal[]
  expensesThreeMonthWindow: Expense[]
  allActiveSubscriptions: Subscription[]
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  viewMonth: ViewMonth,
): Promise<DashboardPayload> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return {
      totalRevenues: 0,
      totalExpenses: 0,
      projectedExpenses: 0,
      movements: [],
      unpaid: [],
      dueSubs: [],
      dueIncomeSources: [],
      goals: [],
      expensesThreeMonthWindow: [],
      allActiveSubscriptions: [],
    }
  }

  const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, user.id)
  if (!activeOrgId) {
    throw new Error('dashboard.error.noOrg')
  }

  const { start: monthStart, end: monthEnd } = getCalendarMonthRange(viewMonth.year, viewMonth.month)
  const today = new Date().toISOString().slice(0, 10)
  const win3 = threeMonthWindowEnd(viewMonth.year, viewMonth.month)

  const [revRes, expRes, projRes, unpaidRes, subsAllRes, incomeRes, goalsRes, expWinRes] =
    await Promise.all([
      supabase
        .from('revenues')
        .select('*')
        .eq('organization_id', activeOrgId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false }),
      supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', activeOrgId)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: false }),
      supabase
        .from('projections')
        .select('projected_expenses')
        .eq('organization_id', activeOrgId)
        .eq('month', monthStart)
        .maybeSingle(),
      supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', activeOrgId)
        .eq('paid', false)
        .order('due_date', { ascending: true })
        .limit(10),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrgId)
        .eq('active', true)
        .order('next_billing_date', { ascending: true }),
      supabase
        .from('income_sources')
        .select('*')
        .eq('organization_id', activeOrgId)
        .eq('active', true)
        .lte('next_receipt_date', today)
        .order('next_receipt_date', { ascending: true }),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('organization_id', activeOrgId),
      supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', activeOrgId)
        .gte('due_date', win3.start)
        .lte('due_date', win3.end),
    ])

  if (revRes.error) throw revRes.error
  if (expRes.error) throw expRes.error
  if (projRes.error) throw projRes.error
  if (subsAllRes.error) throw subsAllRes.error

  const revenues = (revRes.data ?? []) as Revenue[]
  const expenses = (expRes.data ?? []) as Expense[]

  const totalRevenues = revenues.reduce((s, r) => s + Number(r.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  const subsAll = (subsAllRes.data ?? []) as Subscription[]

  const revMoves: DashboardMovement[] = revenues.map((r) => ({
    id: r.id,
    type: 'revenue',
    description: r.description,
    amount: Number(r.amount || 0),
    date: r.date,
    statusKey: r.received ? 'received' : 'pending',
  }))
  const expMoves: DashboardMovement[] = expenses.map((e) => ({
    id: e.id,
    type: 'expense',
    description: e.description,
    amount: Number(e.amount || 0),
    date: e.due_date || e.created_at?.slice(0, 10) || '',
    statusKey: e.paid ? 'paid' : 'open',
  }))
  const movements = [...revMoves, ...expMoves]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)

  return {
    totalRevenues,
    totalExpenses,
    projectedExpenses: Number(projRes.data?.projected_expenses || 0),
    movements,
    unpaid: (unpaidRes.data ?? []) as Expense[],
    dueSubs: subsAll
      .filter((s) => s.next_billing_date <= today)
      .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date)),
    dueIncomeSources: (incomeRes.data ?? []) as IncomeSource[],
    goals: goalsRes.error ? [] : ((goalsRes.data ?? []) as Goal[]),
    expensesThreeMonthWindow: expWinRes.error ? [] : ((expWinRes.data ?? []) as Expense[]),
    allActiveSubscriptions: subsAll,
  }
}

export function applyDashboardPayload(
  data: DashboardPayload,
  setters: {
    setTotalRevenues: (v: number) => void
    setTotalExpenses: (v: number) => void
    setProjectedExpenses: (v: number) => void
    setMovements: (v: DashboardMovement[]) => void
    setUnpaid: (v: Expense[]) => void
    setDueSubs: (v: Subscription[]) => void
    setDueIncomeSources: (v: IncomeSource[]) => void
    setGoals: (v: Goal[]) => void
    setExpensesThreeMonthWindow: (v: Expense[]) => void
    setAllActiveSubscriptions: (v: Subscription[]) => void
  },
): void {
  setters.setTotalRevenues(data.totalRevenues)
  setters.setTotalExpenses(data.totalExpenses)
  setters.setProjectedExpenses(data.projectedExpenses)
  setters.setMovements(data.movements)
  setters.setUnpaid(data.unpaid)
  setters.setDueSubs(data.dueSubs)
  setters.setDueIncomeSources(data.dueIncomeSources)
  setters.setGoals(data.goals)
  setters.setExpensesThreeMonthWindow(data.expensesThreeMonthWindow)
  setters.setAllActiveSubscriptions(data.allActiveSubscriptions)
}
