import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test as base } from '@playwright/test'
import { KeaApi } from '../api/client'
import type { Credentials } from '../api/types'
import { accountByAlias, type AccountMetadata } from '../data/accounts'
import { DashboardPage } from '../pages/DashboardPage'
import { BillingPage } from '../pages/BillingPage'
import { LoginPage } from '../pages/LoginPage'
import { ProfilePage } from '../pages/ProfilePage'
import { PlansPage } from '../pages/PlansPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UsagePage } from '../pages/UsagePage'
import { Sidebar } from '../pages/components/Sidebar'
import { TopBar } from '../pages/components/TopBar'
import { ToastStack } from '../pages/components/ToastStack'
import { LogoutDialog } from '../pages/components/LogoutDialog'
import { authStatePath, requireManagedRun, runDirectory } from '../utils/runtime'

export type TestOptions = { account: AccountMetadata; signedIn: boolean; resetAlerts: boolean }
type Fixtures = {
  api: KeaApi
  usageApi: KeaApi
  credentials: Credentials
  login: LoginPage
  dashboard: DashboardPage
  billing: BillingPage
  profile: ProfilePage
  plans: PlansPage
  settings: SettingsPage
  usage: UsagePage
  sidebar: Sidebar
  topBar: TopBar
  toasts: ToastStack
  logoutDialog: LogoutDialog
  _ready: void
  _alertIsolation: void
  _defectEvidence: void
}

export const test = base.extend<TestOptions & Fixtures>({
  account: [accountByAlias('july'), { option: true }],
  signedIn: [true, { option: true }],
  resetAlerts: [false, { option: true }],

  _ready: [async ({ baseURL }, use) => {
    requireManagedRun()
    const ready = JSON.parse(await readFile(path.join(runDirectory(), 'ready.json'), 'utf8'))
    if (ready.baseURL !== baseURL) throw new Error('The saved account states belong to another target.')
    await use()
  }, { auto: true }],

  storageState: async ({ account, signedIn }, use) => {
    await use(signedIn ? authStatePath(account.customerId) : undefined)
  },
  api: async ({ request }, use) => { await use(new KeaApi(request)) },
  usageApi: async ({ request, account, signedIn, baseURL, _ready }, use) => {
    if (!signedIn || !baseURL) throw new Error('Usage API expectations require a prepared signed-in account.')
    // Reuse setup authentication only; expected readings still come from independent HTTP requests.
    let session: { customerId?: string; accessToken?: string }
    try {
      const state = JSON.parse(await readFile(authStatePath(account.customerId), 'utf8')) as {
        origins: { origin: string; localStorage: { name: string; value: string }[] }[]
      }
      const origin = state.origins.find((entry) => entry.origin === new URL(baseURL).origin)
      const stored = origin?.localStorage.find((entry) => entry.name === 'kea-demo-session')
      session = JSON.parse(stored?.value ?? '{}')
    } catch {
      throw new Error(`Prepared Usage authentication could not be read for ${account.customerId}.`)
    }
    if (session.customerId !== account.customerId || !session.accessToken?.trim()) {
      throw new Error(`Prepared Usage authentication does not match ${account.customerId}.`)
    }
    await use(new KeaApi(request, session.accessToken))
  },
  credentials: async ({ api, account }, use) => {
    const credentials = (await api.demoAccounts()).find((entry) => entry.customer_id === account.customerId)
    if (!credentials) throw new Error(`Required demo account is unavailable: ${account.customerId}`)
    await use({ email: credentials.email, password: credentials.password })
  },
  login: async ({ page }, use) => { await use(new LoginPage(page)) },
  dashboard: async ({ page }, use) => { await use(new DashboardPage(page)) },
  billing: async ({ page, account }, use) => { await use(new BillingPage(page, account.customerId)) },
  profile: async ({ page }, use) => { await use(new ProfilePage(page)) },
  plans: async ({ page }, use) => { await use(new PlansPage(page)) },
  settings: async ({ page }, use) => { await use(new SettingsPage(page)) },
  usage: async ({ page, account }, use) => { await use(new UsagePage(page, account.customerId)) },
  sidebar: async ({ page }, use) => { await use(new Sidebar(page)) },
  topBar: async ({ page }, use) => { await use(new TopBar(page)) },
  toasts: async ({ page }, use) => { await use(new ToastStack(page)) },
  logoutDialog: async ({ page }, use) => { await use(new LogoutDialog(page)) },

  _alertIsolation: [async ({ api, account, resetAlerts }, use, testInfo) => {
    if (testInfo.project.name === 'settings' && (account.alias !== 'rangi' || !resetAlerts)) {
      throw new Error('The settings project must use Rangi with alert cleanup enabled.')
    }
    if (!resetAlerts) return use()
    if (testInfo.project.name !== 'settings' || account.alias !== 'rangi') {
      throw new Error('Alert changes require the settings project and the reserved Rangi account.')
    }
    const credentials = (await api.demoAccounts()).find((entry) => entry.customer_id === account.customerId)
    if (!credentials) throw new Error(`Required demo account is unavailable: ${account.customerId}`)
    const { access_token } = await api.login(credentials)
    await api.resetAlertPreferences(account.customerId, access_token)
    try {
      await use()
    } finally {
      await api.resetAlertPreferences(account.customerId, access_token)
    }
  }, { auto: true }],

  _defectEvidence: [async ({}, use, testInfo) => {
    await use()
    const defects = testInfo.annotations.filter((annotation) => annotation.type === 'defect')
    if (defects.length) {
      // Attachments survive blob merging and remain visible in HTML and Allure.
      await testInfo.attach('Defect references', {
        body: defects.map((defect) => defect.description ?? '').join('\n'),
        contentType: 'text/plain',
      })
    }
  }, { auto: true }],
})

export { expect } from '@playwright/test'
