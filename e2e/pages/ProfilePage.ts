import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

export class ProfilePage {
  readonly heading: Locator
  readonly emailValue: Locator
  readonly editProfile: Locator
  readonly editDialog: Dialog
  readonly resetPasswordButton: Locator

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Profile', exact: true })
    // The profile uses a definition list: the value directly follows the Email term.
    const emailTerm = page.locator('dl > dt').filter({ hasText: /^Email:$/ })
    this.emailValue = emailTerm.locator('xpath=following-sibling::dd[1]')
    this.editProfile = page.getByRole('button', { name: 'Edit profile', exact: true })
    this.editDialog = new Dialog(page, 'Edit profile')
    this.resetPasswordButton = this.editDialog.button('Reset password')
  }

  async openEditProfile(): Promise<void> {
    await this.editProfile.click()
    await this.editDialog.root.waitFor({ state: 'visible' })
  }
}
