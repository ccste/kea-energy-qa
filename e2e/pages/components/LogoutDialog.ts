import type { Locator, Page } from '@playwright/test'
import { Dialog } from './Dialog'

export class LogoutDialog {
  readonly root: Locator
  readonly prompt: Locator
  readonly confirm: Locator
  readonly cancel: Locator
  private readonly dialog: Dialog

  constructor(page: Page) {
    this.dialog = new Dialog(page, 'Logout')
    this.root = this.dialog.root
    this.prompt = this.root.getByText('Are you sure you want to logout?', { exact: true })
    this.confirm = this.dialog.button('Yes')
    this.cancel = this.dialog.button('Cancel')
  }

  async clickOutside(): Promise<void> {
    await this.dialog.clickOutside()
  }
}
