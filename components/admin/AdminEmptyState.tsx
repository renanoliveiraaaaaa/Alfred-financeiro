'use client'

import { UserX } from 'lucide-react'
import { useEffect, useRef } from 'react'

type Props = {
  title: string
  description?: string
}

export default function AdminEmptyState({ title, description }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (titleRef.current) titleRef.current.focus()
  }, [title])
  return (
    <div
      className="mx-auto flex max-w-md animate-fade-in flex-col items-center justify-center rounded-xl border border-border bg-surface px-8 py-14 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background text-muted">
        <UserX className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <h2 ref={titleRef} className="mt-5 text-lg font-semibold text-main" tabIndex={0} style={{ outline: 'none' }}>
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted" tabIndex={0} style={{ outline: 'none' }}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
