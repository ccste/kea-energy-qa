import type { Locator, Page } from '@playwright/test'

export class TopBar {
  readonly root: Locator
  readonly search: Locator
  readonly profileButton: Locator
  readonly profileMenu: Locator
  readonly profileName: Locator
  readonly profileCustomerId: Locator
  readonly logout: Locator
  readonly themeToggle: Locator

  constructor(page: Page) {
    this.root = page.getByRole('banner').filter({ has: page.getByRole('textbox', { name: 'Search pages' }) })
    this.search = this.root.getByRole('textbox', { name: 'Search pages', exact: true })
    this.profileButton = this.root.getByRole('button', { name: 'Open profile menu', exact: true })
    // The profile panel is an unlabelled div rather than an ARIA menu.
    this.profileMenu = this.root.locator('.profile-menu')
    this.profileName = this.profileMenu.locator('header strong')
    this.profileCustomerId = this.profileMenu.locator('header small')
    this.logout = this.profileMenu.getByRole('button', { name: 'Logout', exact: true })
    this.themeToggle = this.root.getByRole('button', { name: /^Use (?:dark|light) theme$/ })
  }

  async openProfileMenu(): Promise<void> {
    if ((await this.profileButton.getAttribute('aria-expanded')) !== 'true') {
      await this.profileButton.click()
    }
    await this.profileMenu.waitFor({ state: 'visible' })
  }

  async openProfile(): Promise<void> {
    await this.openProfileMenu()
    await this.profileMenu.getByRole('button', { name: 'My Profile', exact: true }).click()
  }
}
