'use client'

import { useUserPreferences, type Gender } from './userPreferencesContext'

/**
 * Retorna o pronome de tratamento conforme o gênero do usuário.
 * M: senhor | F: senhora | O: '' (evita pronome, usa apenas o nome)
 */
export function getGreetingPronoun(gender: Gender | null): string {
  if (gender === 'M') return 'senhor'
  if (gender === 'F') return 'senhora'
  return ''
}

/**
 * Retorna sufixo para mensagens: ", senhor" | ", senhora" | "" (para O)
 * Uso: `Nenhuma categoria registrada${getGreetingSuffix(gender)}.`
 */
export function getGreetingSuffix(gender: Gender | null): string {
  const p = getGreetingPronoun(gender)
  return p ? `, ${p}` : ''
}

/**
 * Retorna o título correto para "Preferências do/da X"
 * M: "do senhor" | F: "da senhora" | O: "pessoais"
 * Uso: `Preferências ${getPrefTitle(gender)}` → "Preferências do senhor" | "Preferências da senhora" | "Preferências pessoais"
 */
export function getPrefTitle(gender: Gender | null): string {
  if (gender === 'M') return 'do senhor'
  if (gender === 'F') return 'da senhora'
  return 'pessoais'
}

/**
 * Retorna a saudação completa.
 * M: "Boa noite, senhor" ou "Boa noite, senhor João"
 * F: "Boa noite, senhora" ou "Boa noite, senhora Ana"
 * O: "Boa noite, Ana" (só nome) ou "Boa noite" (sem pronome)
 */
export function getGreetingWithName(
  greeting: string,
  firstName: string,
  gender: Gender | null
): string {
  const pronoun = getGreetingPronoun(gender)
  if (firstName) {
    return pronoun ? `${greeting}, ${pronoun} ${firstName}` : `${greeting}, ${firstName}`
  }
  return pronoun ? `${greeting}, ${pronoun}` : greeting
}

/** Hook que retorna o pronome de tratamento do usuário logado */
export function useGreetingPronoun(): string {
  const { gender } = useUserPreferences()
  return getGreetingPronoun(gender)
}
