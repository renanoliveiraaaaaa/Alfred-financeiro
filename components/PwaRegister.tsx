'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Em dev o SW interfere com HMR e pode cachear 404/redirects — desregistrar.
    if (process.env.NODE_ENV === 'development') {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister())
      })
      if ('caches' in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      }
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore registration errors */
    })
  }, [])

  return null
}
