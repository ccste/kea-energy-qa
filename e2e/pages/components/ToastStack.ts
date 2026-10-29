import type { Locator, Page } from '@playwright/test'

export class ToastStack {
  readonly root: Locator
  readonly messages: Locator

  constructor(page: Page) {
    // Individual messages have no alert/status role; the stack is a polite live region.
    this.root = page.locator('.toast-stack[aria-live="polite"]')
    this.messages = this.root.locator('.toast')
  }

  message(text: string | RegExp): Locator {
    return this.messages.filter({ hasText: text })
  }

  async dismiss(text: string | RegExp): Promise<void> {
    await this.message(text).getByRole('button', { name: 'Dismiss message', exact: true }).click()
  }
}
