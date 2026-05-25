'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

type CacheEntry<T> = { data: T; ts: number }

const globalCache = new Map<string, CacheEntry<unknown>>()

export type UseCachedQueryOptions = {
  /** Tempo em ms até considerar stale (padrão: 60s) */
  ttl?: number
  /** Recarregar ao montar se stale */
  revalidateOnMount?: boolean
}

export type UseCachedQueryResult<T> = {
  data: T | undefined
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  mutate: (data: T) => void
}

export function useCachedQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {},
): UseCachedQueryResult<T> {
  const { ttl = 60_000, revalidateOnMount = true } = options
  const { t } = useI18n()
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [data, setData] = useState<T | undefined>(() => {
    if (!key) return undefined
    const hit = globalCache.get(key) as CacheEntry<T> | undefined
    return hit?.data
  })
  const [loading, setLoading] = useState(() => {
    if (!key) return false
    const hit = globalCache.get(key)
    return !hit
  })
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!key) return
      const hit = globalCache.get(key) as CacheEntry<T> | undefined
      const fresh = hit && Date.now() - hit.ts < ttl
      if (!force && fresh) {
        setData(hit.data)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await fetcherRef.current()
        globalCache.set(key, { data: result, ts: Date.now() })
        setData(result)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('error.loadFailed'))
      } finally {
        setLoading(false)
      }
    },
    [key, ttl, t],
  )

  useEffect(() => {
    if (!key) return
    if (revalidateOnMount) load(false)
  }, [key, load, revalidateOnMount])

  const mutate = useCallback(
    (next: T) => {
      if (!key) return
      globalCache.set(key, { data: next, ts: Date.now() })
      setData(next)
    },
    [key],
  )

  return {
    data,
    loading,
    error,
    refresh: () => load(true),
    mutate,
  }
}

export function invalidateCachedQuery(key: string) {
  globalCache.delete(key)
}

export function invalidateCachedQueryPrefix(prefix: string) {
  for (const k of globalCache.keys()) {
    if (k.startsWith(prefix)) globalCache.delete(k)
  }
}
