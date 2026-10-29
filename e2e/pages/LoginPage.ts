import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

export class LoginPage {
  readonly heading: Locator
  readonly email: Locator
  readonly password: Locator
  readonly submit: Locator
  readonly welcome: Dialog

  constructor(private readonly page: Page) {
    const form = page.getByRole('main').locator('form')
    this.heading = page.getByRole('heading', { name: 'Login', exact: true })
    this.email = form.getByLabel(/^Email/)
    this.password = form.getByLabel(/^Password/)
    this.submit = form.getByRole('button', { name: 'Login', exact: true })
    this.welcome = new Dialog(page, 'Welcome to Kea Energy')
  }

  async goto(): Promise<void> {
    await this.page.goto('/login')
    await this.heading.waitFor({ state: 'visible' })
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email)
    await this.password.fill(password)
    await Promise.all([
      this.page.waitForURL('**/dashboard'),
      this.submit.click(),
    ])
    await this.page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
    await this.dismissWelcome()
  }

  async dismissWelcome(): Promise<void> {
    if (await this.welcome.root.isVisible()) {
      await this.welcome.button('Explore dashboard').click()
      await this.welcome.root.waitFor({ state: 'hidden' })
    }
  }
}
