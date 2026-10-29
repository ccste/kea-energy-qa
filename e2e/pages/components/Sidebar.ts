import type { Locator, Page } from '@playwright/test'

export class Sidebar {
  readonly root: Locator
  readonly navigation: Locator
  readonly utilities: Locator
  readonly logout: Locator

  constructor(page: Page) {
    this.navigation = page.getByRole('navigation', { name: 'Primary navigation', exact: true })
    this.root = page.getByRole('complementary').filter({ has: this.navigation })
    // Utility actions sit outside the labelled primary navigation.
    this.utilities = this.root.locator('.sidebar-utilities')
    this.logout = this.utilities.getByRole('button', { name: 'Logout', exact: true })
  }

  destination(name: string): Locator {
    return this.navigation.getByRole('button', { name, exact: true })
  }

  async navigateTo(name: string): Promise<void> {
    await this.destination(name).click()
  }

  async openUtility(name: 'Settings' | 'Help & Support'): Promise<void> {
    await this.utilities.getByRole('button', { name, exact: true }).click()
  }
}
