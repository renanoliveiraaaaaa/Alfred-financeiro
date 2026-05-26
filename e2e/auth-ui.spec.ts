import { expect, test } from '@playwright/test'
import { labels } from './helpers/i18n'

test.describe('Auth UI — landing', () => {
  test('alterna entre login e registo', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: labels.registerTab }).click()
    await expect(page.locator('#gender')).toBeVisible()
    await expect(page.getByRole('button', { name: labels.requestAccessButton })).toBeVisible()

    await page.getByRole('button', { name: labels.loginTab }).click()
    await expect(page.locator('#gender')).toHaveCount(0)
    await expect(page.getByRole('button', { name: labels.signInButton })).toBeVisible()
  })

  test('fluxo esqueceu senha — formulário', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: labels.forgotLink }).click()
    await expect(page.getByText(labels.forgotSubtitle)).toBeVisible()
    await expect(page.getByRole('button', { name: labels.forgotSubmit })).toBeVisible()

    await page.getByRole('button', { name: labels.forgotBack }).click()
    await expect(page.getByRole('button', { name: labels.signInButton })).toBeVisible()
  })
})
