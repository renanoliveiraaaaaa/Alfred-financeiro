import { UserX } from 'lucide-react'

type Props = {
  title: string
  description?: string
}

export default function AdminEmptyState({ title, description }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm ring-1 ring-slate-900/5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <UserX className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
    </div>
  )
}
