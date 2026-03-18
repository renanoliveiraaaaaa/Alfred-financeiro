'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'

export type Gender = 'M' | 'F' | 'O'
export type AppTheme = 'normal' | 'alfred'

type UserPreferencesContextType = {
  gender: Gender | null
  appTheme: AppTheme
  loadPreferences: (userId: string) => Promise<void>
  updatePreferences: (updates: { gender?: Gender | null; appTheme?: AppTheme }) => Promise<void>
  setLocalPreferences: (updates: { gender?: Gender | null; appTheme?: AppTheme }) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  gender: null,
  appTheme: 'normal',
  loadPreferences: async () => {},
  updatePreferences: async () => {},
  setLocalPreferences: () => {},
})

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [gender, setGender] = useState<Gender | null>(null)
  const [appTheme, setAppTheme] = useState<AppTheme>('normal')
  const supabase = createSupabaseClient()

  const loadPreferences = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('gender, app_theme')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        setGender((data.gender as Gender) || null)
        setAppTheme((data.app_theme as AppTheme) || 'normal')
      }
    },
    [supabase]
  )

  const updatePreferences = useCallback(
    async (updates: { gender?: Gender | null; appTheme?: AppTheme }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const payload: Record<string, unknown> = {}
      if (updates.gender !== undefined) payload.gender = updates.gender
      if (updates.appTheme !== undefined) payload.app_theme = updates.appTheme

      if (Object.keys(payload).length === 0) return

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userData.user.id)

      if (error) throw error

      if (updates.gender !== undefined) setGender(updates.gender)
      if (updates.appTheme !== undefined) setAppTheme(updates.appTheme)
    },
    [supabase]
  )

  const setLocalPreferences = useCallback((updates: { gender?: Gender | null; appTheme?: AppTheme }) => {
    if (updates.gender !== undefined) setGender(updates.gender)
    if (updates.appTheme !== undefined) setAppTheme(updates.appTheme)
  }, [])

  return (
    <UserPreferencesContext.Provider
      value={{ gender, appTheme, loadPreferences, updatePreferences, setLocalPreferences }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext)
}
