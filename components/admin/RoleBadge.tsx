export default function RoleBadge({ role }: { role: 'user' | 'admin' }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
      user
    </span>
  )
}
