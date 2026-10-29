import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'
import { PasswordResetDialog } from './components/PasswordResetDialog'

export class LoginPage {
  readonly heading: Locator
  readonly email: Locator
  readonly password: Locator
  readonly submit: Locator
  readonly welcome: Dialog
  readonly formError: Locator
  readonly emailError: Locator
  readonly passwordError: Locator
  readonly passwordVisibilityButton: Locator
  readonly demoAccountsToggle: Locator
  readonly createAccount: Locator
  readonly forgotPassword: Locator
  readonly resetPassword: PasswordResetDialog

  constructor(private readonly page: Page) {
    const main = page.getByRole('main')
    const form = main.locator('form')
    this.heading = page.getByRole('heading', { name: 'Login', exact: true })
    this.email = form.getByLabel(/^Email/)
    this.password = form.getByLabel(/^Password/)
    this.submit = form.getByRole('button', { name: /^(?:Login|Signing in…)$/ })
    this.welcome = new Dialog(page, 'Welcome to Kea Energy')
    this.formError = form.getByRole('alert')
    // Field messages have no alert role; these IDs are the inputs' aria-describedby targets.
    this.emailError = form.locator('#email-error')
    this.passwordError = form.locator('#password-error')
    this.passwordVisibilityButton = form.getByRole('button', { name: /^(?:Show|Hide) password$/ })
    this.demoAccountsToggle = main.getByRole('button', {
      name: /^(?:Demo accounts \(\d+\)|Hide demo accounts)$/,
    })
    this.createAccount = main.getByRole('button', { name: 'Create an account', exact: true })
    this.forgotPassword = form.getByRole('button', { name: 'Forgot password?', exact: true })
    this.resetPassword = new PasswordResetDialog(page, 'Reset your password')
  }

  async goto(): Promise<void> {
    await this.page.goto('/login')
    await this.heading.waitFor({ state: 'visible' })
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.email.fill(email)
    await this.password.fill(password)
  }

  async openForgotPassword(): Promise<void> {
    await this.forgotPassword.click()
    await this.resetPassword.root.waitFor({ state: 'visible' })
  }

  async submitCredentials(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password)
    await this.submit.click()
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password)
    await Promise.all([
      this.page.waitForURL('**/dashboard'),
      this.submit.click(),
    ])
    await this.page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
    await this.dismissWelcome()
  }

  demoAccount(displayName: string): Locator {
    return this.page.getByRole('main').getByRole('list').getByRole('button').filter({
      has: this.page.getByText(displayName, { exact: true }),
    })
  }

  socialButton(provider: 'Google' | 'Apple'): Locator {
    return this.page.getByRole('main').getByRole('button', { name: provider, exact: true })
  }

  async dismissWelcome(): Promise<void> {
    if (await this.welcome.root.isVisible()) {
      await this.welcome.button('Explore dashboard').click()
      await this.welcome.root.waitFor({ state: 'hidden' })
    }
  }
}
