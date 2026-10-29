import type { Locator, Page } from '@playwright/test'

export class Dialog {
  readonly root: Locator
  private readonly backdrop: Locator

  constructor(page: Page, name?: string | RegExp) {
    this.root = page.getByRole('dialog', name === undefined ? {} : { name })
    // The backdrop has no accessible name; scope it to this dialog before clicking its edge.
    this.backdrop = page.locator('.modal-backdrop').filter({ has: this.root })
  }

  button(name: string | RegExp): Locator {
    return this.root.getByRole('button', { name, exact: typeof name === 'string' })
  }

  async pressEscape(): Promise<void> {
    await this.root.press('Escape')
    await this.root.waitFor({ state: 'hidden' })
  }

  async clickOutside(): Promise<void> {
    await this.backdrop.click({ position: { x: 5, y: 5 } })
    await this.root.waitFor({ state: 'hidden' })
  }
}
