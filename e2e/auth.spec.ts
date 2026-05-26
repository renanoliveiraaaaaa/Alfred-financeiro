import { expect, test } from '@playwright/test'
import { loginFromLanding } from './helpers/auth'
import { hasE2ECredentials, hasLiveAuthTests } from './helpers/env'
import { labels } from './helpers/i18n'

test.describe('Auth integrado', () => {
  test.skip(!hasE2ECredentials(), 'Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD no .env.local')

  test('login com credenciais válidas', async ({ page }) => {
    await loginFromLanding(page)
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15_000 })
  })

  test('login inválido exibe erro', async ({ page }) => {
    await page.goto('/')
    await page.locator(labels.emailField).fill('nao-existe@example.com')
    await page.locator(labels.passwordField).fill('senha-invalida-123')
    await page.getByRole('button', { name: labels.signInButton }).click()
    await expect(page.getByText(labels.invalidCredentials)).toBeVisible({ timeout: 15_000 })
  })

  test('logout e nova sessão', async ({ page }) => {
    await loginFromLanding(page)

    const logout = page.getByRole('button', { name: /Sair|Logout|Encerrar/i })
    if (await logout.count()) {
      await logout.first().click()
      await expect(page).toHaveURL('/', { timeout: 15_000 })
    }
  })
})

test.describe('Auth live (opcional)', () => {
  test.skip(!hasLiveAuthTests(), 'Defina E2E_LIVE_AUTH=1 e Supabase real no .env.local')

  test('fluxo esqueceu senha — envio', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: labels.forgotLink }).click()
    await page.locator(labels.emailField).fill(process.env.E2E_TEST_EMAIL ?? 'e2e-test@example.com')
    await page.getByRole('button', { name: labels.forgotSubmit }).click()
    await expect(page.getByText(labels.forgotSentTitle)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('CRUD smoke (autenticado)', () => {
  test.skip(!hasE2ECredentials(), 'Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD no .env.local')

  test('navega despesas e receitas', async ({ page }) => {
    await loginFromLanding(page)

    await page.goto('/expenses')
    await expect(page).toHaveURL(/\/expenses/)
    await expect(page.locator('main, [role="main"], body')).toBeVisible()

    await page.goto('/revenues')
    await expect(page).toHaveURL(/\/revenues/)
  })

  test('settings carrega secção de equipa (business)', async ({ page }) => {
    await loginFromLanding(page)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('body')).toContainText(labels.teamSection, {
      timeout: 15_000,
    })
  })
})
