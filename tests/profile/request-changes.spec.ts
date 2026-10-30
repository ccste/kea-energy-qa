import type { Locator } from '@playwright/test'
import { accountByAlias } from '../../data/accounts'
import type { ProfileContactDetails, ProfilePage } from '../../pages/ProfilePage'
import { observeApiRequests } from '../../utils/browser-requests'
import { expect, test } from './profile-test'

test.use({ account: accountByAlias('ana') })

const confirmationText = 'Contact changes go to our team to apply — nothing on your account has changed yet'
const changedDetails: ProfileContactDetails = {
  name: 'Ana Test',
  address: '1 Test Street, Auckland',
  phone: '021 123 4567',
  email: 'ana.test@kea.example',
}

async function expectPrefilled(profile: ProfilePage, original: ProfileContactDetails): Promise<void> {
  await expect(profile.fullName).toHaveValue(original.name)
  await expect(profile.address).toHaveValue(original.address)
  await expect(profile.contactNumber).toHaveValue(original.phone)
  await expect(profile.emailAddress).toHaveValue(original.email)
}

async function expectOriginalDetails(profile: ProfilePage, original: ProfileContactDetails): Promise<void> {
  await expect(profile.editProfile).toBeEnabled()
  await expect(profile.detail('Name:')).toHaveText(original.name)
  await expect(profile.detail('Address:')).toHaveText(original.address)
  await expect(profile.detail('Contact Number:')).toHaveText(original.phone)
  await expect(profile.emailValue).toHaveText(original.email)
}

async function expectNativeValidation(field: Locator, rule: 'valueMissing' | 'typeMismatch'): Promise<void> {
  const validity = await field.evaluate((element: HTMLInputElement) => ({
    valid: element.validity.valid,
    valueMissing: element.validity.valueMissing,
    typeMismatch: element.validity.typeMismatch,
    message: element.validationMessage,
  }))
  expect(validity.valid, 'Browser validation rejects the input').toBe(false)
  expect(validity[rule], `The browser reports ${rule}`).toBe(true)
  expect(validity.message, 'The browser supplies its own field validation message').not.toBe('')
  await expect(field).toBeFocused()
}

test.describe('Profile Management', () => {
  test.describe('Request profile changes', () => {
    test.beforeEach(async ({ dashboard, topBar, profile, toasts }) => {
      await dashboard.goto()
      await topBar.openProfile()
      await expect(profile.heading).toBeVisible()
      await expect(profile.editProfile).toBeEnabled()
      for (const label of ['Name:', 'Address:', 'Contact Number:', 'Email:'] as const) {
        await expect(profile.detail(label), 'Ana has all four editable fields on file').not.toHaveText('Not on file')
        await expect(profile.detail(label)).not.toBeEmpty()
      }
      await expect(toasts.messages).toHaveCount(0)
    })

    test.describe('Positive Testing', () => {
      test('Edit form opens pre-filled with the current details', async ({ page, profile }) => {
        const original = await profile.readContactDetails()
        const requests = observeApiRequests(page)
        await profile.openEditProfile()
        await expectPrefilled(profile, original)
        expect(requests, 'Opening the edit form must not call the API').toEqual([])
      })

      test('Change all four fields, then Request changes', async ({ page, profile, toasts }) => {
        const original = await profile.readContactDetails()
        for (const key of ['name', 'address', 'phone', 'email'] as const) {
          expect(changedDetails[key], `The draft changes ${key}`).not.toBe(original[key])
        }
        const requests = observeApiRequests(page)
        await profile.openEditProfile()
        await profile.fillContactDetails(changedDetails)
        await profile.requestChanges.click()
        await expect(profile.editDialog.root).toBeHidden()
        await expect(toasts.message(confirmationText)).toHaveText(confirmationText)
        await expectOriginalDetails(profile, original)
        expect(requests, 'The prototype request must not call the API').toEqual([])

        await test.step('Reload and compare with the details saved before editing', async () => {
          await page.reload()
          await expect(profile.heading).toBeVisible()
          await expectOriginalDetails(profile, original)
        })
      })

      for (const example of [
        { format: 'mobile', value: '021 123 4567' },
        { format: 'landline', value: '09 123 4567' },
        { format: 'international', value: '+64 21 123 4567' },
      ]) {
        test(`Valid NZ phone formats are accepted — ${example.format}: ${example.value}`, async ({ page, profile, toasts }) => {
          const requests = observeApiRequests(page)
          await profile.openEditProfile()
          await profile.contactNumber.fill(example.value)
          await profile.requestChanges.click()
          await expect(profile.editDialog.root).toBeHidden()
          await expect(toasts.message(confirmationText)).toHaveText(confirmationText)
          expect(requests, 'Accepting a phone format must not send a prototype change request').toEqual([])
        })
      }

      test('Change fields, then Cancel', async ({ page, profile, toasts }) => {
        const original = await profile.readContactDetails()
        const requests = observeApiRequests(page)
        await profile.openEditProfile()
        await profile.fillContactDetails(changedDetails)
        await profile.cancelChanges.click()
        await expect(profile.editDialog.root).toBeHidden()
        await expect(toasts.messages).toHaveCount(0)
        await expectOriginalDetails(profile, original)
        await profile.openEditProfile()
        await expectPrefilled(profile, original)
        expect(requests, 'Cancelling and reopening the draft must not call the API').toEqual([])
      })
    })

    test.describe('Negative Testing', () => {
      test.describe('Full name', () => {
        test('Empty', async ({ page, profile, toasts }) => {
          const requests = observeApiRequests(page)
          await profile.openEditProfile()
          await profile.fullName.fill('')
          await profile.requestChanges.click()
          await expectNativeValidation(profile.fullName, 'valueMissing')
          await expect(profile.editDialog.root).toBeVisible()
          await expect(toasts.messages).toHaveCount(0)
          expect(requests, 'An invalid name must not call the API').toEqual([])
        })
      })

      test.describe('Email address', () => {
        test('Invalid format', async ({ page, profile, toasts }) => {
          const requests = observeApiRequests(page)
          await profile.openEditProfile()
          await profile.emailAddress.fill('ana.kea.example')
          await profile.requestChanges.click()
          await expectNativeValidation(profile.emailAddress, 'typeMismatch')
          await expect(profile.editDialog.root).toBeVisible()
          await expect(toasts.messages).toHaveCount(0)
          expect(requests, 'An invalid email must not call the API').toEqual([])
        })
      })

      test.describe('Contact number', () => {
        for (const example of [
          { group: 'Length', title: 'Too few digits', value: '0211' },
          { group: 'Length', title: 'Too many digits', value: '021 1234 5678 9012 34' },
          { group: 'Rule', title: 'Not an NZ number prefix', value: '121 196 1501' },
          { group: 'Type', title: 'Contains letters', value: '021-abc-1001' },
        ]) {
          test.describe(example.group, () => {
            test(example.title, async ({ page, profile, toasts }, testInfo) => {
              testInfo.annotations.push({ type: 'defect', description: '#3 Invalid New Zealand phone numbers must be rejected.' })
              const requests = observeApiRequests(page)
              await profile.openEditProfile()
              await profile.contactNumber.fill(example.value)
              await profile.requestChanges.click()

              // Capture the outcome before a transient acceptance toast can disappear.
              const outcome = {
                input: example.value,
                dialogOpen: await profile.editDialog.root.isVisible(),
                toasts: await toasts.messages.allTextContents(),
                nativeValidation: await profile.contactNumber.evaluateAll((elements: HTMLInputElement[]) =>
                  elements.map((element) => ({
                    valid: element.validity.valid,
                    message: element.validationMessage,
                    focused: element === document.activeElement,
                  })),
                ),
                inlineErrors: await profile.phoneValidationError.filter({ visible: true }).allTextContents(),
              }
              await testInfo.attach('Invalid phone submission outcome', {
                body: JSON.stringify(outcome, null, 2), contentType: 'application/json',
              })
              expect.soft(outcome.dialogOpen, 'An invalid phone number must keep the edit dialog open').toBe(true)
              expect.soft(outcome.toasts, 'An invalid phone number must not show a submission toast').toEqual([])
              const nativeError = outcome.nativeValidation.some((value) => !value.valid && value.focused && value.message.trim().length > 0)
              expect.soft(nativeError || outcome.inlineErrors.length > 0,
                'The contact field must show browser validation or an error requesting a valid NZ phone number',
              ).toBe(true)
              expect(requests, 'An invalid phone number must not call the API').toEqual([])
            })
          })
        }
      })
    })
  })
})
