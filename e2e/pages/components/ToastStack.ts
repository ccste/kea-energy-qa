import type { Locator, Page } from '@playwright/test'

export class ToastStack {
  readonly root: Locator

  constructor(page: Page) {
    // Individual messages have no alert/status role; the stack is a polite live region.
    this.root = page.locator('.toast-stack[aria-live="polite"]')
  }

  message(text: string | RegExp): Locator {
    return this.root.locator('.toast').filter({ hasText: text })
  }

  async dismiss(text: string | RegExp): Promise<void> {
    await this.message(text).getByRole('button', { name: 'Dismiss message', exact: true }).click()
  }
}
