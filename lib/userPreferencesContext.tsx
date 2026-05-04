'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'

export type Gender = 'M' | 'F' | 'O'
export type AppTheme = 'normal' | 'gala' | 'classic' | 'club' | 'liquid'

type UserPreferencesContextType = {
  gender: Gender | null
  appTheme: AppTheme
  isAdmin: boolean
  activeOrgType: 'personal' | 'business'
  setActiveOrgType: (type: 'personal' | 'business') => void
  loadPreferences: (userId: string) => Promise<void>
  updatePreferences: (updates: { gender?: Gender | null; appTheme?: AppTheme }) => Promise<void>
  setLocalPreferences: (updates: { gender?: Gender | null; appTheme?: AppTheme }) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  gender: null,
  appTheme: 'normal',
  isAdmin: false,
  activeOrgType: 'personal',
  setActiveOrgType: () => {},
  loadPreferences: async () => {},
  updatePreferences: async () => {},
  setLocalPreferences: () => {},
})

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [gender, setGender] = useState<Gender | null>(null)
  const [appTheme, setAppTheme] = useState<AppTheme>('normal')
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeOrgType, setActiveOrgType] = useState<'personal' | 'business'>('personal')
  const supabase = useMemo(() => createSupabaseClient(), [])

  const loadPreferences = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('gender, app_theme, role')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        setGender((data.gender as Gender) || null)
        setAppTheme((data.app_theme as AppTheme) || 'normal')
        setIsAdmin(data.role === 'admin')
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

  const contextValue = useMemo(
    () => ({ gender, appTheme, isAdmin, activeOrgType, setActiveOrgType, loadPreferences, updatePreferences, setLocalPreferences }),
    [gender, appTheme, isAdmin, activeOrgType, setActiveOrgType, loadPreferences, updatePreferences, setLocalPreferences]
  )

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext)
}
