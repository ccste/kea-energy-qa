import { expect, test } from '../../fixtures/test'

test.use({ signedIn: false })

test.describe('Login', () => {
  test.describe('Password visibility', () => {
    test('Show / hide password', async ({ login }) => {
      const sample = 'visibility-check'
      await login.goto()
      await login.password.fill(sample)

      await test.step('Keep the password hidden by default', async () => {
        await expect(login.password).toHaveAttribute('type', 'password')
        await expect(login.passwordVisibilityButton).toHaveAccessibleName('Show password')
      })
      await test.step('Show the entered value', async () => {
        await login.passwordVisibilityButton.click()
        await expect(login.password).toHaveAttribute('type', 'text')
        await expect(login.password).toHaveValue(sample)
        await expect(login.passwordVisibilityButton).toHaveAccessibleName('Hide password')
      })
      await test.step('Hide the value again', async () => {
        await login.passwordVisibilityButton.click()
        await expect(login.password).toHaveAttribute('type', 'password')
        await expect(login.password).toHaveValue(sample)
        await expect(login.passwordVisibilityButton).toHaveAccessibleName('Show password')
      })
    })
  })

  test.describe('Go to sign-up', () => {
    test('Create an account link', async ({ page, login }) => {
      await login.goto()
      await login.createAccount.click()
      await expect(page).toHaveURL(/\/register$/)
      await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible()
    })
  })
})
