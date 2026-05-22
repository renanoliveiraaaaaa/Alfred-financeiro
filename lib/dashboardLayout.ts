export type DashboardSectionId =
  | 'attention'
  | 'alerts_income'
  | 'alerts_subs'
  | 'summary'
  | 'buying_power'
  | 'subscription_radar'
  | 'budgets'
  | 'movements'
  | 'unpaid'

export type DashboardSectionConfig = {
  id: DashboardSectionId
  visible: boolean
}

export const DASHBOARD_SECTION_META: Record<
  DashboardSectionId,
  { label: string; description: string }
> = {
  attention: {
    label: 'Painel de atenção',
    description: 'Alertas e lembretes importantes do mês.',
  },
  alerts_income: {
    label: 'Recebimentos agendados',
    description: 'Confirmação rápida de entradas previstas para hoje.',
  },
  alerts_subs: {
    label: 'Renovações pendentes',
    description: 'Assinaturas com cobrança em aberto.',
  },
  summary: {
    label: 'Resumo do mês',
    description: 'Saldo, entradas, saídas e orçamento.',
  },
  buying_power: {
    label: 'Poder de compra',
    description: 'Quanto sobra após metas e despesas fixas.',
  },
  subscription_radar: {
    label: 'Radar de assinaturas',
    description: 'Assinaturas possivelmente subutilizadas.',
  },
  budgets: {
    label: 'Orçamentos por categoria',
    description: 'Progresso das metas de gasto.',
  },
  movements: {
    label: 'Movimentações',
    description: 'Entradas e saídas do período selecionado.',
  },
  unpaid: {
    label: 'Compromissos pendentes',
    description: 'Despesas em aberto e vencimentos.',
  },
}

const SECTION_I18N_KEYS: Record<DashboardSectionId, { labelKey: string; descKey: string }> = {
  attention: { labelKey: 'dashboard.section.attention.label', descKey: 'dashboard.section.attention.desc' },
  alerts_income: { labelKey: 'dashboard.section.alerts_income.label', descKey: 'dashboard.section.alerts_income.desc' },
  alerts_subs: { labelKey: 'dashboard.section.alerts_subs.label', descKey: 'dashboard.section.alerts_subs.desc' },
  summary: { labelKey: 'dashboard.section.summary.label', descKey: 'dashboard.section.summary.desc' },
  buying_power: { labelKey: 'dashboard.section.buying_power.label', descKey: 'dashboard.section.buying_power.desc' },
  subscription_radar: { labelKey: 'dashboard.section.subscription_radar.label', descKey: 'dashboard.section.subscription_radar.desc' },
  budgets: { labelKey: 'dashboard.section.budgets.label', descKey: 'dashboard.section.budgets.desc' },
  movements: { labelKey: 'dashboard.section.movements.label', descKey: 'dashboard.section.movements.desc' },
  unpaid: { labelKey: 'dashboard.section.unpaid.label', descKey: 'dashboard.section.unpaid.desc' },
}

export function getDashboardSectionMeta(
  t: (key: string) => string,
): Record<DashboardSectionId, { label: string; description: string }> {
  return Object.fromEntries(
    (Object.keys(SECTION_I18N_KEYS) as DashboardSectionId[]).map((id) => [
      id,
      {
        label: t(SECTION_I18N_KEYS[id].labelKey),
        description: t(SECTION_I18N_KEYS[id].descKey),
      },
    ]),
  ) as Record<DashboardSectionId, { label: string; description: string }>
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardSectionConfig[] = [
  { id: 'attention', visible: true },
  { id: 'alerts_income', visible: true },
  { id: 'alerts_subs', visible: true },
  { id: 'summary', visible: true },
  { id: 'buying_power', visible: true },
  { id: 'subscription_radar', visible: true },
  { id: 'budgets', visible: true },
  { id: 'movements', visible: true },
  { id: 'unpaid', visible: true },
]

const STORAGE_PREFIX = 'alfred_dashboard_layout_v1'

function storageKey(userId?: string) {
  return userId ? `${STORAGE_PREFIX}_${userId}` : STORAGE_PREFIX
}

export function mergeWithDefaults(saved: DashboardSectionConfig[]): DashboardSectionConfig[] {
  const byId = new Map(saved.map((s) => [s.id, s]))
  const merged: DashboardSectionConfig[] = []

  for (const def of DEFAULT_DASHBOARD_LAYOUT) {
    const existing = byId.get(def.id)
    merged.push(existing ? { id: def.id, visible: existing.visible } : { ...def })
    byId.delete(def.id)
  }

  for (const extra of byId.values()) {
    merged.push(extra)
  }

  return merged
}

export function loadDashboardLayout(userId?: string): DashboardSectionConfig[] {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_LAYOUT
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT
    const parsed = JSON.parse(raw) as DashboardSectionConfig[]
    if (!Array.isArray(parsed)) return DEFAULT_DASHBOARD_LAYOUT
    return mergeWithDefaults(parsed)
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT
  }
}

export function saveDashboardLayout(layout: DashboardSectionConfig[], userId?: string): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

export function resetDashboardLayout(userId?: string): DashboardSectionConfig[] {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
  return DEFAULT_DASHBOARD_LAYOUT.map((s) => ({ ...s }))
}

export function isSectionVisible(
  layout: DashboardSectionConfig[],
  id: DashboardSectionId,
): boolean {
  return layout.find((s) => s.id === id)?.visible ?? true
}

export function visibleSections(layout: DashboardSectionConfig[]): DashboardSectionId[] {
  return layout.filter((s) => s.visible).map((s) => s.id)
}

export function moveSection(
  layout: DashboardSectionConfig[],
  id: DashboardSectionId,
  direction: 'up' | 'down',
): DashboardSectionConfig[] {
  const idx = layout.findIndex((s) => s.id === id)
  if (idx < 0) return layout
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= layout.length) return layout
  const next = [...layout]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  return next
}

export function toggleSectionVisibility(
  layout: DashboardSectionConfig[],
  id: DashboardSectionId,
): DashboardSectionConfig[] {
  return layout.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
}
