'use client'

import { useEffect } from 'react'

/** Bloqueia pinch/double-tap zoom no shell da app em telemóveis (comportamento tipo app nativa). */
export default function MobilePinchGuard() {
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    if (!mq.matches) return

    document.documentElement.classList.add('mobile-no-zoom')

    const blockGesture = (event: Event) => {
      event.preventDefault()
    }

    document.addEventListener('gesturestart', blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })
    document.addEventListener('gestureend', blockGesture, { passive: false })

    return () => {
      document.documentElement.classList.remove('mobile-no-zoom')
      document.removeEventListener('gesturestart', blockGesture)
      document.removeEventListener('gesturechange', blockGesture)
      document.removeEventListener('gestureend', blockGesture)
    }
  }, [])

  return null
}
