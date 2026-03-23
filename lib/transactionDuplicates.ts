/**
 * Agrupa receitas/despesas provavelmente duplicadas (mesmo valor, data e descrição normalizada).
 * Parcelas de cartão (installment_number/installments) entram na chave para não confundir com duplicata.
 */

export function normalizeDescriptionForDuplicate(description: string): string {
  return description
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function dateKeyFromIsoDate(date: string): string {
  return date.slice(0, 10)
}

export function revenueDuplicateFingerprint(r: {
  date: string
  amount: number
  description: string
}): string {
  return `${dateKeyFromIsoDate(r.date)}|${Number(r.amount).toFixed(2)}|${normalizeDescriptionForDuplicate(r.description)}`
}

export function expenseDuplicateFingerprint(e: {
  due_date: string | null
  created_at: string
  amount: number
  description: string
  category: string
  installments: number | null
  installment_number: number | null
}): string {
  const dateKey = e.due_date ? dateKeyFromIsoDate(e.due_date) : dateKeyFromIsoDate(e.created_at)
  const inst =
    e.installments != null && e.installment_number != null
      ? `|parc:${e.installment_number}/${e.installments}`
      : ''
  return `${dateKey}|${Number(e.amount).toFixed(2)}|${normalizeDescriptionForDuplicate(e.description)}|${e.category}${inst}`
}

export type DuplicateCluster = {
  fingerprint: string
  ids: string[]
  /** Mantém o registro mais antigo (created_at); demais sugeridos para exclusão */
  suggestedDeleteIds: string[]
}

export function clusterDuplicatesByFingerprint<T extends { id: string; created_at: string }>(
  items: T[],
  fingerprintFn: (item: T) => string
): DuplicateCluster[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const fp = fingerprintFn(item)
    const arr = map.get(fp)
    if (arr) arr.push(item)
    else map.set(fp, [item])
  }

  const clusters: DuplicateCluster[] = []
  for (const [fp, arr] of map) {
    if (arr.length < 2) continue
    const sorted = [...arr].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    clusters.push({
      fingerprint: fp,
      ids: sorted.map((x) => x.id),
      suggestedDeleteIds: sorted.slice(1).map((x) => x.id),
    })
  }
  return clusters
}

export function allIdsInDuplicateClusters(clusters: DuplicateCluster[]): Set<string> {
  const s = new Set<string>()
  for (const c of clusters) {
    for (const id of c.ids) s.add(id)
  }
  return s
}

export function allSuggestedDeleteIds(clusters: DuplicateCluster[]): Set<string> {
  const s = new Set<string>()
  for (const c of clusters) {
    for (const id of c.suggestedDeleteIds) s.add(id)
  }
  return s
}
