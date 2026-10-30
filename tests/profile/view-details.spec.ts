import { accountByAlias } from '../../data/accounts'
import { expect, test } from './profile-test'

const examples = [
  { alias: 'cold', title: 'Demo household (Cold Snap Household)' },
  { alias: 'julia', title: 'Data-platform account (Julia Fox)' },
  { alias: 'generated', title: 'Generated household (Generated Demo Household)' },
] as const

const subtitle = 'Review and manage your customer contact details.'

test.describe('Profile Management', () => {
  test.describe('View profile details', () => {
    test.describe('Positive Testing', () => {
      for (const example of examples) {
        const selectedAccount = accountByAlias(example.alias)

        test.describe(() => {
          test.use({ account: selectedAccount })

          test(example.title, { tag: example.alias === 'cold' ? '@smoke' : [] }, async ({
            account, api, dashboard, topBar, profile,
          }) => {
            const expected = await api.profile(account.customerId)
            expect(expected.customer_id).toBe(account.customerId)

            await dashboard.goto()
            await topBar.openProfile()
            await expect(profile.heading).toBeVisible()
            await expect(profile.subtitle).toHaveText(subtitle)
            await expect(profile.editProfile).toBeEnabled()
            await expect(profile.details).toBeVisible()

            if (example.alias === 'cold') {
              expect(expected.name, 'The documented household has no stored profile name').toBeNull()
              await expect(profile.detail('Name:')).toHaveText('Cold Snap Household')
              await expect(profile.detail('Account no.:')).toHaveText('H-COLD')

              const missingFields = [
                ['Address:', expected.address],
                ['Contact Number:', expected.phone],
                ['Email:', expected.email],
                ['Plan:', expected.plan_name],
              ] as const
              for (const [label, value] of missingFields) {
                expect.soft(value, `Cold Snap Household has no ${label} value on file`).toBeNull()
                await expect.soft(profile.detail(label)).toHaveText('Not on file')
              }
              expect.soft(expected.icp_number).toBeNull()
              expect.soft(expected.network_name).toBeNull()
              await expect.soft(profile.term('ICP:')).toHaveCount(0)
              await expect.soft(profile.term('Network:')).toHaveCount(0)
              await expect.soft(profile.detail('ICP:')).toBeHidden()
              await expect.soft(profile.detail('Network:')).toBeHidden()
            } else {
              const fields = [
                ['Name:', expected.name ?? account.displayName],
                ['Account no.:', expected.account_number ?? expected.customer_id],
                ['Address:', expected.address ?? 'Not on file'],
                ['Contact Number:', expected.phone ?? 'Not on file'],
                ['Email:', expected.email ?? 'Not on file'],
                ['Plan:', expected.plan_name ?? 'Not on file'],
              ] as const
              for (const [label, value] of fields) {
                await expect.soft(profile.detail(label), `${label} matches the Profile response`).toHaveText(value)
              }

              const requiredExtraFields = [
                ['ICP:', expected.icp_number],
                ['Network:', expected.network_name],
              ] as const
              for (const [label, value] of requiredExtraFields) {
                const expectedValue = value ?? ''
                expect(expectedValue.trim(), `${account.displayName} has a documented ${label} value in the Profile response`)
                  .not.toBe('')
                await expect.soft(profile.detail(label)).toBeVisible()
                await expect.soft(profile.detail(label)).toHaveText(expectedValue)
              }
            }

            await expect(profile.detail('Password:')).toHaveText('••••••••')
          })

          test(`Name on the Profile page matches the name in the avatar menu — ${selectedAccount.displayName}`, async ({
            account, api, credentials, dashboard, topBar, profile,
          }, testInfo) => {
            if (example.alias === 'generated') {
              testInfo.annotations.push({
                type: 'defect',
                description: '#2 Profile name and avatar name should identify the same customer.',
              })
            }
            const { customer_id: loginCustomerId, display_name: loginDisplayName } = await api.login(credentials)
            const expected = await api.profile(account.customerId)
            expect(loginCustomerId).toBe(account.customerId)
            expect(expected.customer_id).toBe(account.customerId)

            await dashboard.goto()
            await topBar.openProfile()
            await expect(profile.heading).toBeVisible()
            await expect(profile.subtitle).toHaveText(subtitle)
            await expect(profile.editProfile).toBeEnabled()
            const profileName = (await profile.detail('Name:').innerText()).trim()
            await topBar.openProfileMenu()
            const avatarName = (await topBar.profileName.innerText()).trim()
            const profileSource = `GET /api/households/${account.customerId}/profile → name`
            const avatarSource = 'POST /api/auth/login → display_name'

            await testInfo.attach('Profile and avatar name sources', {
              body: JSON.stringify({
                customerId: account.customerId,
                profile: { source: profileSource, name: expected.name, displayedName: profileName },
                avatar: { source: avatarSource, displayName: loginDisplayName, displayedName: avatarName },
              }, null, 2),
              contentType: 'application/json',
            })
            expect.soft(profileName, `Profile name comes from ${profileSource}, with the sign-in name as its fallback`)
              .toBe(expected.name ?? loginDisplayName)
            expect.soft(avatarName, `Avatar name comes from ${avatarSource}`).toBe(loginDisplayName)
            expect(profileName,
              `Profile name (${profileSource}): ${JSON.stringify(profileName)}; `
              + `avatar name (${avatarSource}): ${JSON.stringify(avatarName)}`,
            ).toBe(avatarName)
          })
        })
      }
    })

    test.describe('Negative Testing', () => {
      test.use({ account: accountByAlias('cold') })

      test('Profile service unavailable', async ({ account, page, dashboard, topBar, profile }) => {
        const profilePath = `/api/households/${account.customerId}/profile`
        await dashboard.goto()
        await page.route((url) => url.pathname === profilePath, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback()
            return
          }
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Profile service unavailable.' }),
          })
        })
        const pendingProfile = page.waitForResponse((response) =>
          response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
        )
        await topBar.openProfile()
        expect((await pendingProfile).status()).toBe(500)
        await expect(profile.heading).toBeVisible()
        await expect(profile.errorAlert).toContainText('Could not load your details:')
        await expect(profile.details).toBeHidden()
        await expect(profile.editProfile).toBeHidden()
      })
    })
  })
})
