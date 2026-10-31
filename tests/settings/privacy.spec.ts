import { expect, test } from './settings-test'

test.describe('Settings Change', () => {
  test.describe('View privacy information', () => {
    test('Privacy and data', async ({ page, account, api, openSettings, settings, preferenceWrites }) => {
      const saved = await api.alertPreferences(account.customerId)
      await openSettings()
      const dialog = settings.privacy

      for (const dismissal of ['Done', 'Escape', 'outside the dialog'] as const) {
        await test.step(`Read the privacy information and close with ${dismissal}`, async () => {
          await settings.privacyButton.click()
          await expect(dialog.root).toBeVisible()
          await expect(dialog.root).toHaveAccessibleName('Privacy information')
          await expect(dialog.root.getByRole('heading', { name: 'Privacy information', exact: true })).not.toBeInViewport()
          await expect(dialog.root.getByRole('button', { name: 'Close', exact: true, includeHidden: true })).toBeHidden()
          await expect(dialog.root.getByText(
            'Kea Energy collects account, contact, usage, billing and support information to provide your energy service.',
            { exact: true },
          )).toBeVisible()
          await expect(dialog.root.getByRole('heading', { name: 'Your rights', exact: true })).toBeVisible()
          for (const right of [
            'You can request access to your personal information.',
            'You can ask for incorrect details to be corrected.',
            'Your data is protected using appropriate security controls.',
          ]) {
            await expect(dialog.root.getByText(right, { exact: true })).toBeVisible()
          }
          await expect(dialog.button('Done')).toBeVisible()

          const viewport = page.viewportSize()
          const bounds = await dialog.root.boundingBox()
          expect(viewport, 'Privacy is checked in the configured desktop viewport').not.toBeNull()
          expect(bounds, 'The visible privacy dialog has a rendered bounding box').not.toBeNull()
          expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport!.width / 2), 'The dialog is horizontally centred').toBeLessThanOrEqual(1)
          expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport!.height / 2), 'The dialog is vertically centred').toBeLessThanOrEqual(1)

          if (dismissal === 'Done') await dialog.button('Done').click()
          else if (dismissal === 'Escape') await dialog.pressEscape()
          else await dialog.clickOutside()
          await expect(dialog.root).toBeHidden()
          await expect(page).toHaveURL(/\/settings$/)
          await expect(settings.heading).toBeVisible()
        })
      }

      expect(preferenceWrites, 'Viewing privacy information must not save account preferences').toHaveLength(0)
      expect(await api.alertPreferences(account.customerId)).toEqual(saved)
    })
  })
})
