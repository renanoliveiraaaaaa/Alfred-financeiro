'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type PrivacyContextType = {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
})

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)
  const togglePrivacyMode = useCallback(() => setIsPrivacyMode((p) => !p), [])

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}
