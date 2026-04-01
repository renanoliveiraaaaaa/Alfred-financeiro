'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Trash2 } from 'lucide-react'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast } from '@/lib/toastContext'
import { deleteUserProfile, updateUserRole } from '@/lib/actions/admin'

type Props = {
  targetUserId: string
  initialRole: 'user' | 'admin'
  viewerId: string
}

export default function AdminUserActions({ targetUserId, initialRole, viewerId }: Props) {
  const router = useRouter()
  const { toast, toastError } = useToast()
  const [role, setRole] = useState<'user' | 'admin'>(initialRole)
  useEffect(() => {
    setRole(initialRole)
  }, [initialRole])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingRole, startRoleTransition] = useTransition()
  const [pendingDelete, startDeleteTransition] = useTransition()

  const isSelf = targetUserId === viewerId
  const roleDirty = role !== initialRole

  const applyRole = () => {
    startRoleTransition(async () => {
      const res = await updateUserRole(targetUserId, role)
      if (!res.ok) {
        toastError(res.error)
        setRole(initialRole)
        return
      }
      toast('Nível de acesso atualizado.', 'success')
      router.refresh()
    })
  }

  const confirmDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteUserProfile(targetUserId)
      if (!res.ok) {
        toastError(res.error)
        return
      }
      setDeleteOpen(false)
      toast('Registo do perfil removido.', 'success')
      router.push('/admin/users')
      router.refresh()
    })
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 lg:max-w-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="h-4 w-4 text-slate-600" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900">Ações de gestão</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="admin-role-select" className="block text-xs font-medium text-slate-500">
              Alterar nível de acesso
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                id="admin-role-select"
                value={role}
                disabled={isSelf || pendingRole}
                onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="user">Utilizador (user)</option>
                <option value="admin">Administrador (admin)</option>
              </select>
              <button
                type="button"
                disabled={isSelf || !roleDirty || pendingRole}
                onClick={applyRole}
                className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingRole ? 'A guardar…' : 'Aplicar'}
              </button>
            </div>
            {isSelf ? (
              <p className="mt-2 text-xs text-slate-500">
                Não pode alterar o papel da sua própria conta aqui.
              </p>
            ) : null}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-red-700">Zona de perigo</p>
            <button
              type="button"
              disabled={isSelf}
              onClick={() => setDeleteOpen(true)}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              Excluir registo
            </button>
            {isSelf ? (
              <p className="mt-2 text-xs text-slate-500">Não pode excluir o seu próprio perfil.</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Remove a linha em <code className="text-slate-600">profiles</code>. A sessão em
                autenticação pode persistir até remover o utilizador no Supabase Auth.
              </p>
            )}
          </div>
        </div>
      </section>

      <ConfirmDangerModal
        open={deleteOpen}
        title="Excluir perfil do cliente"
        description="O registo será removido da tabela de perfis. Esta ação não apaga automaticamente a conta de login (auth). Confirma que deseja continuar?"
        confirmLabel="Sim, excluir registo"
        loading={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
