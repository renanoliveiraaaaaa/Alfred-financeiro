export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  )
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT ?? 'mailto:noreply@alfredfinanceiro.app'
}

import webpush from 'web-push'

export function configureWebPush(): void {
  if (!isPushConfigured()) return

  webpush.setVapidDetails(
    getVapidSubject(),
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}
