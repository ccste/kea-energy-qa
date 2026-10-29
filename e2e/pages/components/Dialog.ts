import type { Locator, Page } from '@playwright/test'

export class Dialog {
  readonly root: Locator

  constructor(page: Page, name?: string | RegExp) {
    this.root = page.getByRole('dialog', name === undefined ? {} : { name })
  }

  button(name: string | RegExp): Locator {
    return this.root.getByRole('button', { name, exact: typeof name === 'string' })
  }

  async pressEscape(): Promise<void> {
    await this.root.press('Escape')
    await this.root.waitFor({ state: 'hidden' })
  }
}
