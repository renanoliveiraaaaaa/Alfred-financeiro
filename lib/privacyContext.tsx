'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type PrivacyContextType = {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
  setPrivacyMode: (value: boolean) => void
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
  setPrivacyMode: () => {},
})

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)
  const togglePrivacyMode = useCallback(() => setIsPrivacyMode((p) => !p), [])
  const setPrivacyMode = useCallback((value: boolean) => setIsPrivacyMode(value), [])

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode, setPrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}
