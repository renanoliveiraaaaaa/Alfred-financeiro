export default function RoleBadge({ role }: { role: 'user' | 'admin' }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-600/40 bg-amber-950 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-100">
        admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
      user
    </span>
  )
}
