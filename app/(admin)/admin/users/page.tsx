import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import RoleBadge from '@/components/admin/RoleBadge'

function formatDatePt(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function displayName(fullName: string | null, id: string) {
  const trimmed = fullName?.trim()
  if (trimmed) return trimmed
  return `ID ${id.slice(0, 8)}…`
}

type ActivityRow = {
  user_id: string
  expense_count: number | string
  revenue_count: number | string
}

export default async function AdminUsersPage() {
  const supabase = createSupabaseServerClient()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: totalsRaw, error: rpcError } = await supabase.rpc('admin_user_activity_totals')

  const volumeByUser = new Map<string, number>()
  for (const row of (totalsRaw ?? []) as ActivityRow[]) {
    const e = Number(row.expense_count)
    const r = Number(row.revenue_count)
    volumeByUser.set(row.user_id, e + r)
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
        Gestão de Clientes
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Lista de perfis ordenados pelo registo mais recente. Volume de dados = despesas + receitas
        por utilizador.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Erro ao carregar utilizadores: {error.message}
        </p>
      )}

      {rpcError && !error && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Volume por utilizador indisponível: {rpcError.message}. Aplique a migração com a função{' '}
          <code className="text-amber-950">admin_user_activity_totals</code>.
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-semibold text-slate-700 lg:px-5">Usuário / Nome</th>
                <th className="px-4 py-3 font-semibold text-slate-700 lg:px-5">Data de cadastro</th>
                <th className="px-4 py-3 font-semibold text-slate-700 lg:px-5">Papel</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 lg:px-5">
                  Volume de dados
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 lg:px-5 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!profiles?.length && !error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 lg:px-5">
                    Nenhum perfil encontrado.
                  </td>
                </tr>
              ) : (
                profiles?.map((row) => {
                  const vol = volumeByUser.get(row.id)
                  const volLabel =
                    rpcError || vol === undefined ? '—' : vol.toLocaleString('pt-BR')
                  const isPower = typeof vol === 'number' && vol >= 20

                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900 lg:px-5">
                        {displayName(row.full_name, row.id)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-600 lg:px-5">
                        {formatDatePt(row.created_at)}
                      </td>
                      <td className="px-4 py-3.5 lg:px-5">
                        <RoleBadge role={row.role} />
                      </td>
                      <td
                        className="px-4 py-3.5 text-center lg:px-5"
                        title={
                          isPower
                            ? 'Alto volume: muitas despesas e receitas (power user)'
                            : 'Soma do número de despesas e receitas deste utilizador'
                        }
                      >
                        <span
                          className={`inline-flex min-w-[2.5rem] justify-center tabular-nums font-medium ${
                            isPower ? 'text-amber-800' : 'text-slate-700'
                          }`}
                        >
                          {volLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right lg:px-5">
                        <Link
                          href={`/admin/users/${row.id}`}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
