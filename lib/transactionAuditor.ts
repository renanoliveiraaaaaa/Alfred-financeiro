/**
 * Heurísticas para detetar despesas que parecem estar no contexto organizacional errado
 * (Pessoal vs Business). Usado pelo insight do Alfred e pela UI de conciliação.
 */

export type OrganizationKind = 'personal' | 'business'

export type ContextMismatchResult = {
  /** Palavras ou padrões que motivaram a suspeita */
  matchedHints: string[]
  /** Contexto onde a despesa deveria estar, em princípio */
  suggestedTarget: OrganizationKind
}

const CATEGORY_LABELS_PT: Record<string, string> = {
  mercado: 'mercado',
  alimentacao: 'alimentação',
  compras: 'compras online',
  transporte: 'transporte',
  combustivel: 'combustível',
  veiculo: 'veículo',
  assinaturas: 'assinaturas',
  saude: 'saúde',
  educacao: 'educação',
  lazer: 'lazer',
  moradia: 'moradia',
  fatura_cartao: 'fatura de cartão',
  outros: 'outros',
}

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Frases ou termos compostos (substring) */
const BUSINESS_PHRASES = [
  'google cloud',
  'google workspace',
  'microsoft 365',
  'office 365',
  'nota fiscal',
  'nota fisc',
  'nf-e',
  'nfe ',
  ' nfs-e',
  'nfs-e',
  'nfse',
  'fornecedor',
  'simples nacional',
  'folha de pagamento',
  'pro labore',
  'pro-labore',
  'pró-labore',
  'aluguel escritorio',
  'aluguel escritório',
  'coworking',
  'licenca de software',
  'licença de software',
  'hospedagem site',
  'registro.br',
  'contabilidade',
  'escritorio contabil',
  'escritório contábil',
  'dominio ',
  'domínio ',
  'certificado digital',
  'maquina de cartao',
  'máquina de cartão',
  'cnpj',
  'emitente',
  'mei ',
  'darf ',
  'gps ', // Guia da Previdência Social, contexto trabalhista
]

/** Tokens curtos: correspondência por limite de palavra */
const BUSINESS_TOKENS = [
  'aws',
  'nfe',
  'gcp',
  'azure',
  'stripe',
  'heroku',
  'vercel',
  'shopify',
  'hostinger',
  'digitalocean',
  'openai',
  'anthropic',
  'slack', // muitas empresas; ainda assim comum em business
  'github',
  'gitlab',
  'jira',
  'notion',
  'asana',
  'trello',
  'quickbooks',
  'conta azul',
]

const PERSONAL_PHRASES = [
  'supermercado',
  'hipermercado',
  'padaria',
  'panific',
  'farmacia',
  'farmácia',
  'drogaria',
  'restaurante',
  'lanchonete',
  'ifood',
  'uber eats',
  'rappi',
  'ze delivery',
  'zé delivery',
  'academia',
  'smart fit',
  'cinema',
  'streaming',
  'netflix',
  'spotify',
  'cabeleireiro',
  'cabeleireira',
  'barbearia',
  'salao de beleza',
  'salão de beleza',
  'pet shop',
  'petshop',
  'hortifruti',
  'acougue',
  'açougue',
  'shopping center',
  'shopping ',
  'mercadinho',
  'conveniencia',
  'conveniência',
  'pao de acucar',
  'pão de açúcar',
  'carrefour',
  'atacadao',
  'atacadão',
  'extra ',
  'pague menos',
]

const PERSONAL_TOKENS = ['padaria', 'mercado', 'feira', 'lanchonete']

/** Em org Business, estas categorias padrão sugerem consumo pessoal */
const PERSONAL_LEANING_CATEGORIES = new Set(['mercado', 'alimentacao', 'lazer'])

function collectBusinessHints(normalizedDesc: string, normalizedCat: string): string[] {
  const hints: string[] = []
  const blob = `${normalizedDesc} ${normalizedCat}`

  for (const p of BUSINESS_PHRASES) {
    if (blob.includes(p)) hints.push(p.trim())
  }
  for (const t of BUSINESS_TOKENS) {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i')
    if (re.test(blob)) hints.push(t)
  }
  return [...new Set(hints)]
}

function collectPersonalHints(normalizedDesc: string, normalizedCat: string): string[] {
  const hints: string[] = []
  const blob = `${normalizedDesc} ${normalizedCat}`

  for (const p of PERSONAL_PHRASES) {
    if (blob.includes(p)) hints.push(p.trim())
  }
  for (const t of PERSONAL_TOKENS) {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i')
    if (re.test(blob)) hints.push(t)
  }
  return [...new Set(hints)]
}

/**
 * Analisa descrição e categoria face ao tipo da organização atual.
 * Retorna null se não houver suspeita de contexto trocado.
 */
export function detectExpenseContextMismatch(params: {
  description: string
  category: string
  organizationType: OrganizationKind
}): ContextMismatchResult | null {
  const desc = normalizeForMatch(params.description)
  const catKey = normalizeForMatch(params.category || '')
  const catLabel = CATEGORY_LABELS_PT[catKey] ?? catKey
  const catBlob = normalizeForMatch(`${catKey} ${catLabel}`)

  if (params.organizationType === 'personal') {
    const hints = collectBusinessHints(desc, catBlob)
    if (hints.length === 0) return null
    return { matchedHints: hints.slice(0, 6), suggestedTarget: 'business' }
  }

  const hintsFromText = collectPersonalHints(desc, catBlob)
  const categoryHints: string[] = []
  if (PERSONAL_LEANING_CATEGORIES.has(catKey)) {
    categoryHints.push(`categoria:${catLabel || catKey}`)
  }
  const hints = [...new Set([...hintsFromText, ...categoryHints])]
  if (hints.length === 0) return null
  return { matchedHints: hints.slice(0, 6), suggestedTarget: 'personal' }
}

export type UserOrgRef = { id: string; type: OrganizationKind; name: string }

/**
 * Resolve a organização de destino para uma sugestão (primeira business ou a org pessoal).
 */
export function resolveTargetOrganization(
  suggested: OrganizationKind,
  userOrganizations: UserOrgRef[],
): UserOrgRef | null {
  if (suggested === 'business') {
    const businesses = userOrganizations.filter((o) => o.type === 'business')
    businesses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return businesses[0] ?? null
  }
  return userOrganizations.find((o) => o.type === 'personal') ?? null
}
