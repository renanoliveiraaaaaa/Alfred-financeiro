import { expect, test } from '@playwright/test'
import { labels } from './helpers/i18n'

test.describe('Smoke — páginas públicas', () => {
  test('landing carrega formulário de login', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('img', { name: /Alfred/i })).toBeVisible()
    await expect(page.getByRole('button', { name: labels.loginTab })).toBeVisible()
    await expect(page.getByRole('button', { name: labels.registerTab })).toBeVisible()
    await expect(page.locator(labels.passwordField)).toBeVisible()
  })

  test('página /privacidade responde 200', async ({ page }) => {
    const res = await page.goto('/privacidade')
    expect(res?.status()).toBeLessThan(400)

    await expect(
      page.getByRole('heading', { name: 'Política de Privacidade e Termos de Uso' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: '← Voltar' })).toHaveAttribute('href', '/')
  })

  test('footer aponta para /privacidade', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Política de Privacidade e Termos de Uso' })).toHaveAttribute(
      'href',
      '/privacidade',
    )
  })

  test('reset-password carrega formulário ou aviso', async ({ page }) => {
    await page.goto('/auth/reset-password')
    await expect(page.getByText(/Digital vault|Cofre digital/i)).toBeVisible({ timeout: 15_000 })
    await expect(
      page
        .getByRole('heading', { name: labels.resetInvalidTitle })
        .or(page.getByRole('heading', { name: labels.resetNewPasswordTitle })),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('convite inválido pede login', async ({ page }) => {
    await page.goto('/invite/e2e-token-invalido')
    await expect(page.getByRole('heading', { name: labels.inviteLoginTitle })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: labels.inviteLoginCta })).toBeVisible()
  })
})

test.describe('Smoke — rotas protegidas', () => {
  test('dashboard redireciona visitante para /', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/')
    await expect(page.locator(labels.passwordField)).toBeVisible()
  })

  test('admin redireciona visitante para /', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/')
  })
})
