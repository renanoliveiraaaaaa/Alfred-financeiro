import { expect, type Page } from '@playwright/test'
import { labels } from './i18n'
import { getE2ECredentials } from './env'

export async function loginFromLanding(page: Page, email?: string, password?: string) {
  const creds = email && password ? { email, password } : getE2ECredentials()

  await page.goto('/')
  await page.getByRole('button', { name: labels.loginTab }).click()
  await page.locator(labels.emailField).fill(creds.email)
  await page.locator(labels.passwordField).fill(creds.password)
  await page.getByRole('button', { name: labels.signInButton }).click()
  await expect(page).toHaveURL(/\/(dashboard|admin\/dashboard)/, { timeout: 30_000 })
}
