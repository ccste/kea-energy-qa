import type { Locator, Page } from '@playwright/test'
import { Dialog } from './Dialog'

export class PasswordResetDialog {
  readonly dialog: Dialog
  readonly root: Locator
  readonly email: Locator
  readonly error: Locator
  readonly cancel: Locator
  readonly send: Locator

  constructor(page: Page, title: 'Reset your password' | 'Reset password') {
    this.dialog = new Dialog(page, title)
    this.root = this.dialog.root
    // Only the signed-out reset dialog has an editable email address.
    this.email = this.root.getByLabel('Email address', { exact: true })
    this.error = this.root.getByRole('alert')
    this.cancel = this.dialog.button('Cancel')
    this.send = this.dialog.button('Send reset link')
  }

  async pressEscape(): Promise<void> {
    await this.dialog.pressEscape()
  }

  async clickOutside(): Promise<void> {
    await this.dialog.clickOutside()
  }
}
