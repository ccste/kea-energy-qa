import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

export type ProfileField = 'Name:' | 'Account no.:' | 'Address:' | 'Contact Number:' | 'Email:' | 'Plan:' | 'ICP:' | 'Network:' | 'Password:'
export type ProfileContactDetails = { name: string; address: string; phone: string; email: string }

export class ProfilePage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly details: Locator
  readonly errorAlert: Locator
  readonly emailValue: Locator
  readonly editProfile: Locator
  readonly editDialog: Dialog
  readonly resetPasswordButton: Locator
  readonly fullName: Locator
  readonly address: Locator
  readonly contactNumber: Locator
  readonly emailAddress: Locator
  readonly requestChanges: Locator
  readonly cancelChanges: Locator
  readonly phoneValidationError: Locator

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Profile', exact: true })
    this.subtitle = page.getByText('Review and manage your customer contact details.', { exact: true })
    // The signed-in content section has no landmark role or accessible name.
    const content = page.locator('.page-content')
    this.details = content.locator('dl')
    this.errorAlert = content.getByRole('alert')
    this.emailValue = this.detail('Email:')
    this.editProfile = page.getByRole('button', { name: 'Edit profile', exact: true })
    this.editDialog = new Dialog(page, 'Edit profile')
    this.resetPasswordButton = this.editDialog.button('Reset password')
    this.fullName = this.editDialog.root.getByLabel('Full name', { exact: true })
    this.address = this.editDialog.root.getByLabel('Address', { exact: true })
    this.contactNumber = this.editDialog.root.getByLabel('Contact number', { exact: true })
    this.emailAddress = this.editDialog.root.getByLabel('Email address', { exact: true })
    this.requestChanges = this.editDialog.button('Request changes')
    this.cancelChanges = this.editDialog.button('Cancel')
    this.phoneValidationError = this.editDialog.root.getByText(/valid (?:NZ|New Zealand) (?:phone |contact |telephone )?number/i)
  }

  term(label: ProfileField): Locator {
    return this.details.locator('dt').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
  }

  detail(label: ProfileField): Locator {
    // Each unlabelled value directly follows its term in the profile definition list.
    return this.term(label).locator('xpath=following-sibling::dd[1]')
  }

  async readContactDetails(): Promise<ProfileContactDetails> {
    return {
      name: (await this.detail('Name:').innerText()).trim(),
      address: (await this.detail('Address:').innerText()).trim(),
      phone: (await this.detail('Contact Number:').innerText()).trim(),
      email: (await this.emailValue.innerText()).trim(),
    }
  }

  async fillContactDetails(values: ProfileContactDetails): Promise<void> {
    await this.fullName.fill(values.name)
    await this.address.fill(values.address)
    await this.contactNumber.fill(values.phone)
    await this.emailAddress.fill(values.email)
  }

  async openEditProfile(): Promise<void> {
    await this.editProfile.click()
    await this.editDialog.root.waitFor({ state: 'visible' })
  }
}
