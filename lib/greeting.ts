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

/**
 * Retorna a saudação em partes para destacar o pronome+nome com cor de acento.
 * base: "Boa noite" | accent: ", senhor Renan" (para text-brand)
 */
export function getGreetingParts(
  greeting: string,
  firstName: string,
  gender: Gender | null
): { base: string; accent: string } {
  const pronoun = getGreetingPronoun(gender)
  if (firstName) {
    const accent = pronoun ? `, ${pronoun} ${firstName}` : `, ${firstName}`
    return { base: greeting, accent }
  }
  if (pronoun) {
    return { base: greeting, accent: `, ${pronoun}` }
  }
  return { base: greeting, accent: '' }
}

/** Hook que retorna o pronome de tratamento do usuário logado */
export function useGreetingPronoun(): string {
  const { gender } = useUserPreferences()
  return getGreetingPronoun(gender)
}
