import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test as setup } from '@playwright/test'
import { KeaApi } from '../../api/client'
import { ACCOUNTS } from '../../data/accounts'
import { LoginPage } from '../../pages/LoginPage'
import { authStatePath, requireManagedRun, runDirectory } from '../../utils/runtime'

setup('prepare alert defaults and signed-in account states', async ({ browser, request, baseURL }) => {
  requireManagedRun()
  setup.setTimeout(180_000)
  const api = new KeaApi(request)
  const offered = await api.demoAccounts()
  const required = ACCOUNTS.map((account) => {
    const credentials = offered.find((candidate) => candidate.customer_id === account.customerId)
    if (!credentials) throw new Error(`Required demo account is unavailable: ${account.customerId}`)
    return { account, credentials }
  })

  await mkdir(path.join(runDirectory(), 'auth'), { recursive: true, mode: 0o700 })

  await setup.step('Restore default alert settings for all 15 required accounts', async () => {
    for (const { account, credentials } of required) {
      await setup.step(account.displayName, async () => {
        const session = await api.login(credentials)
        await api.resetAlertPreferences(account.customerId, session.access_token)
      })
    }
  })

  // At most two sign-ins are active; each account gets a separate browser context.
  for (let index = 0; index < required.length; index += 2) {
    await Promise.all(required.slice(index, index + 2).map(({ account, credentials }) =>
      setup.step(`Save signed-in state for ${account.displayName}`, async () => {
        const context = await browser.newContext({ baseURL })
        try {
          const login = new LoginPage(await context.newPage())
          await login.goto()
          await login.signIn(credentials.email, credentials.password)
          const state = await context.storageState({ path: authStatePath(account.customerId) })
          const stored = state.origins.flatMap((origin) => origin.localStorage)
          const session = stored.find((item) => item.name === 'kea-demo-session')
          const welcomed = stored.find((item) => item.name === 'kea-onboarding-seen')
          if (!session || JSON.parse(session.value).customerId !== account.customerId || welcomed?.value !== 'true') {
            throw new Error(`A usable signed-in state was not prepared for ${account.customerId}.`)
          }
          await chmod(authStatePath(account.customerId), 0o600)
        } finally {
          await context.close()
        }
      }),
    ))
  }

  await writeFile(path.join(runDirectory(), 'ready.json'), JSON.stringify({
    baseURL,
    accounts: ACCOUNTS.map((account) => account.customerId),
  }), { mode: 0o600 })
})
