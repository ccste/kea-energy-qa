import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test as base } from '@playwright/test'
import { KeaApi } from '../api/client'
import type { Credentials } from '../api/types'
import { accountByAlias, type AccountMetadata } from '../data/accounts'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { Sidebar } from '../pages/components/Sidebar'
import { TopBar } from '../pages/components/TopBar'
import { ToastStack } from '../pages/components/ToastStack'
import { authStatePath, runDirectory } from '../utils/runtime'

export type TestOptions = { account: AccountMetadata; signedIn: boolean; resetAlerts: boolean }
type Fixtures = {
  api: KeaApi
  credentials: Credentials
  login: LoginPage
  dashboard: DashboardPage
  sidebar: Sidebar
  topBar: TopBar
  toasts: ToastStack
  _ready: void
  _alertIsolation: void
  _defectEvidence: void
}

export const test = base.extend<TestOptions & Fixtures>({
  account: [accountByAlias('july'), { option: true }],
  signedIn: [true, { option: true }],
  resetAlerts: [false, { option: true }],

  _ready: [async ({ baseURL }, use) => {
    const ready = JSON.parse(await readFile(path.join(runDirectory(), 'ready.json'), 'utf8'))
    if (ready.baseURL !== baseURL) throw new Error('The saved account states belong to another target.')
    await use()
  }, { auto: true }],

  storageState: async ({ account, signedIn }, use) => {
    await use(signedIn ? authStatePath(account.customerId) : undefined)
  },
  api: async ({ request }, use) => { await use(new KeaApi(request)) },
  credentials: async ({ api, account }, use) => {
    const credentials = (await api.demoAccounts()).find((entry) => entry.customer_id === account.customerId)
    if (!credentials) throw new Error(`Required demo account is unavailable: ${account.customerId}`)
    await use({ email: credentials.email, password: credentials.password })
  },
  login: async ({ page }, use) => { await use(new LoginPage(page)) },
  dashboard: async ({ page }, use) => { await use(new DashboardPage(page)) },
  sidebar: async ({ page }, use) => { await use(new Sidebar(page)) },
  topBar: async ({ page }, use) => { await use(new TopBar(page)) },
  toasts: async ({ page }, use) => { await use(new ToastStack(page)) },

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
