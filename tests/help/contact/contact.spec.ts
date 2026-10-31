import { expect, test } from './clipboard-test'
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../../data/contact-details'

test.describe('Contact', () => {
  // Keep real clipboard operations apart in headed runs; each case still has an independent result.
  test.describe.configure({ mode: 'default' })

  test.describe('Call Customer Care', () => {
    test('Copy the phone number', { tag: '@smoke' }, async ({ help, toasts, clipboardMatches }) => {
      await expect(help.customerCareCard.getByRole('heading', { name: 'Call Customer Care', exact: true })).toBeVisible()
      await expect(help.customerCareCard.getByText('Monday to Friday, 9am–5pm', { exact: true })).toBeVisible()
      await help.phoneCopy.click()
      await expect(toasts.message('Customer Care number copied')).toBeVisible()
      await expect.poll(() => clipboardMatches(CONTACT_PHONE), {
        message: `The Copy button must place ${CONTACT_PHONE} on the real clipboard`,
      }).toBe(true)
    })

    test('Call now', async ({ help }, testInfo) => {
      testInfo.annotations.push({ type: 'defect', description: '#31 The phone number must be visible in its contact card as well as present in the call link.' })
      await expect(help.callNow).toBeVisible()
      await expect(help.callNow).toHaveAttribute('href', 'tel:0800000532')
      await expect(help.customerCareCard.getByText(CONTACT_PHONE, { exact: true })).toBeVisible()
    })
  })

  test.describe('Email Support', () => {
    test('Copy the email address', async ({ help, toasts, clipboardMatches }) => {
      await expect(help.emailSupportCard.getByRole('heading', { name: 'Email support', exact: true })).toBeVisible()
      await expect(help.emailSupportCard.getByText('Get a response from the support team.', { exact: true })).toBeVisible()
      await help.emailCopy.click()
      await expect(toasts.message('Support email copied')).toBeVisible()
      await expect.poll(() => clipboardMatches(CONTACT_EMAIL), {
        message: `The Copy button must place ${CONTACT_EMAIL} on the real clipboard`,
      }).toBe(true)
    })

    test('Write email', async ({ help }, testInfo) => {
      testInfo.annotations.push({ type: 'defect', description: '#31 The email address must be visible in its contact card as well as present in the email link.' })
      await expect(help.writeEmail).toBeVisible()
      await expect(help.writeEmail).toHaveAttribute('href', 'mailto:support@kea-energy.example?subject=Kea%20Energy%20support')
      await expect(help.emailSupportCard.getByText(CONTACT_EMAIL, { exact: true })).toBeVisible()
    })
  })

  test.describe('Ask Sparky AI', () => {
    test('Ask Sparky opens Sparky AI', async ({ page, help, sidebar }) => {
      await expect(help.sparkyCard.getByRole('heading', { name: 'Ask Sparky AI', exact: true })).toBeVisible()
      await expect(help.sparkyCard.getByText('Get an instant answer about your own usage, bill or plan.', { exact: true })).toBeVisible()
      await help.contactAskSparky.click()
      await expect(page).toHaveURL(/\/assistant$/)
      await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible()
      await expect(sidebar.destination('Sparky AI')).toHaveClass(/\bactive\b/)
    })
  })
})
