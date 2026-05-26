/**
 * Valida que types/supabase.ts declara colunas críticas das migrations.
 * Usado no CI quando Docker/Supabase local não está disponível no dev.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const typesPath = join(root, 'types', 'supabase.ts')
const typesSrc = readFileSync(typesPath, 'utf8')

/** table → colunas que devem existir no bloco Row da tabela */
const REQUIRED = {
  profiles: [
    'created_at',
    'locale',
    'custom_theme',
    'role',
    'subscription_status',
    'subscription_plan',
  ],
  activity_logs: ['organization_id', 'action', 'metadata'],
  organizations: ['owner_id', 'slug', 'type'],
  organization_members: ['organization_id', 'profile_id', 'role'],
  organization_invites: ['organization_id', 'email', 'role', 'token', 'invited_by', 'expires_at'],
  revenues: ['organization_id', 'import_session_id', 'source'],
  expenses: ['organization_id', 'import_session_id', 'source', 'credit_card_id'],
  import_sessions: ['organization_id', 'bank', 'status'],
  categories: ['organization_id', 'monthly_budget'],
  credit_cards: ['organization_id', 'closing_day', 'due_day'],
  subscriptions: ['organization_id'],
  income_sources: ['organization_id', 'frequency'],
  goals: ['organization_id', 'target_amount'],
  projections: ['organization_id', 'projected_expenses'],
}

function extractTableBlock(table) {
  const marker = `${table}: {`
  const start = typesSrc.indexOf(marker)
  if (start === -1) return null
  const rowStart = typesSrc.indexOf('Row: {', start)
  if (rowStart === -1) return null
  const rowEnd = typesSrc.indexOf('\n        }', rowStart)
  if (rowEnd === -1) return null
  return typesSrc.slice(rowStart, rowEnd)
}

let failed = false

for (const [table, columns] of Object.entries(REQUIRED)) {
  const block = extractTableBlock(table)
  if (!block) {
    console.error(`[validate:types] Tabela ausente: ${table}`)
    failed = true
    continue
  }
  for (const col of columns) {
    const present =
      block.includes(`${col}:`) || block.includes(`${col}?:`)
    if (!present) {
      console.error(`[validate:types] ${table}.Row.${col} ausente em types/supabase.ts`)
      failed = true
    }
  }
}

if (failed) {
  process.exit(1)
}

console.log('[validate:types] types/supabase.ts OK — colunas críticas presentes.')
