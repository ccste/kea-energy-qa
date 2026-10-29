import { randomUUID } from 'node:crypto'
import type { Response } from '@playwright/test'
import type { LoginResponse } from '../../api/types'
import { accountByAlias } from '../../data/accounts'
import { expect, test } from '../../fixtures/test'

test.use({ signedIn: false, account: accountByAlias('july') })

const loginPath = '/api/auth/login'
const isLoginResponse = (response: Response) =>
  response.request().method() === 'POST' && new URL(response.url()).pathname === loginPath

const validAccounts = [
  { alias: 'july', title: 'Valid email and password: demo household (July Household)' },
  { alias: 'tama', title: 'Valid email and password: data-platform account (Tama Rewiri)' },
  { alias: 'generated', title: 'Valid email and password: generated household (Generated Demo Household)' },
] as const

const invalidEmailFormats = [
  { title: 'Empty', value: (_email: string) => '' },
  { title: 'Missing @ symbol', value: (email: string) => email.replace('@', '') },
  { title: 'Missing domain part', value: (email: string) => `${email.split('@')[0]}@` },
  { title: 'Missing username part', value: (email: string) => `@${email.split('@')[1]}` },
  { title: 'Missing . in domain part', value: (email: string) => {
    const [name, domain] = email.split('@')
    return `${name}@${domain.replaceAll('.', '')}`
  } },
]

test.describe('Login', () => {
  test.describe('Sign in with email and password', () => {
    test.describe('Positive Testing', () => {
      for (const example of validAccounts) {
        test(example.title, { tag: example.alias === 'july' ? '@smoke' : [] }, async ({ api, page, login, dashboard, topBar, toasts }) => {
          const account = accountByAlias(example.alias)
          const credentials = (await api.demoAccounts()).find((entry) => entry.customer_id === account.customerId)
          if (!credentials) throw new Error(`Required demo account is unavailable: ${account.customerId}`)

          await login.goto()
          const responsePromise = page.waitForResponse(isLoginResponse)
          await login.submitCredentials(credentials.email, credentials.password)
          const response = await responsePromise
          expect(response.status(), 'The browser sign-in request succeeds').toBe(200)
          const { customer_id: customerId, display_name: displayName } = await response.json() as LoginResponse
          expect(customerId).toBe(account.customerId)
          expect(displayName).toBe(account.displayName)

          await expect(page).toHaveURL(/\/dashboard$/)
          await expect(dashboard.heading).toBeVisible()
          await expect(dashboard.greeting).toHaveText(`Welcome, ${displayName}`)
          const welcomeToast = toasts.message(`Welcome back, ${displayName}`)
          await expect(welcomeToast).toBeVisible()
          await expect(welcomeToast).toHaveText(`Welcome back, ${displayName}`)
          const toastBounds = await welcomeToast.boundingBox()
          const viewport = page.viewportSize()
          if (!toastBounds || !viewport) throw new Error('The welcome toast needs a visible desktop viewport.')
          expect(toastBounds.x, 'The welcome toast is in the right half of the page').toBeGreaterThanOrEqual(viewport.width / 2)
          expect(toastBounds.y + toastBounds.height, 'The welcome toast is near the top of the page').toBeLessThan(viewport.height / 2)

          await login.dismissWelcome()
          await topBar.openProfileMenu()
          await expect(topBar.profileName).toHaveText(displayName)
          await expect(topBar.profileCustomerId).toHaveText(`CID: ${customerId}`)
          await expect(welcomeToast).toBeHidden({ timeout: 6_000 })
        })
      }
    })

    test.describe('Negative Testing', () => {
      test.describe('Email', () => {
        test.describe('Length', () => {
          test('Longer than 254 characters', async ({ credentials, page, login }) => {
            const domain = credentials.email.split('@')[1]
            const nameLength = 255 - domain.length - 1
            if (nameLength < 1) throw new Error('The runtime email domain is too long for this test input.')
            const email = `${'x'.repeat(nameLength)}@${domain}`
            expect(email).toHaveLength(255)

            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(email, credentials.password)
            const response = await responsePromise
            expect(response.status(), 'An unknown long email is rejected without a server error').toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })
        })

        test.describe('Rule', () => {
          for (const example of invalidEmailFormats) {
            test(example.title, async ({ credentials, page, login }) => {
              let loginRequests = 0
              page.on('request', (request) => {
                if (request.method() === 'POST' && new URL(request.url()).pathname === loginPath) loginRequests++
              })
              await page.route((url) => url.pathname === loginPath, async (route) => {
                // An unexpected submission must not sign the account in.
                await route.fulfill({ status: 502, contentType: 'text/plain', body: '' })
              })

              await login.goto()
              await login.submitCredentials(example.value(credentials.email), credentials.password)
              await expect(login.emailError).toHaveText('Enter a valid email address.')
              await expect(login.email).toHaveAttribute('aria-invalid', 'true')
              await expect(login.password).toHaveAttribute('aria-invalid', 'false')
              await expect(login.submit).toBeEnabled()
              await expect(login.formError).toBeHidden()
              await expect(page).toHaveURL(/\/login$/)
              expect(loginRequests, 'Email format validation must not send a login request').toBe(0)
            })
          }

          test('Extra @ symbol', async ({ credentials, page, login }) => {
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(credentials.email.replace('@', '@@'), credentials.password)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })

          test('Leading / trailing spaces', async ({ credentials, account, page, login, dashboard }) => {
            await login.goto()
            // Finding #1 was not reproduced through normal email entry; retain the expected sign-in.
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(` ${credentials.email} `, credentials.password)
            const response = await responsePromise
            expect(response.status()).toBe(200)
            const { customer_id: customerId, display_name: displayName } = await response.json() as LoginResponse
            expect(customerId).toBe(account.customerId)
            expect(displayName).toBe(account.displayName)
            await expect(page).toHaveURL(/\/dashboard$/)
            await expect(dashboard.heading).toBeVisible()
            await expect(dashboard.greeting).toHaveText(`Welcome, ${displayName}`)
            await login.dismissWelcome()
          })

          test('Not registered', async ({ credentials, page, login }) => {
            const domain = credentials.email.split('@')[1]
            const email = `unregistered-${randomUUID()}@${domain}`
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(email, credentials.password)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })
        })

        test.describe('Type', () => {
          test('Contains special characters', async ({ credentials, page, login }) => {
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(credentials.email.replace('@', '!#$%@'), credentials.password)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })
        })
      })

      test.describe('Password', () => {
        test.describe('Length', () => {
          test('Shorter than 8 characters', async ({ credentials, page, login }) => {
            if (credentials.password.length < 8) throw new Error('This case requires a runtime demo password of at least eight characters.')
            const password = credentials.password.slice(0, 7)
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(credentials.email, password)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })
        })

        test.describe('Rule', () => {
          test('Empty', async ({ credentials, page, login }) => {
            let loginRequests = 0
            page.on('request', (request) => {
              if (request.method() === 'POST' && new URL(request.url()).pathname === loginPath) loginRequests++
            })
            await page.route((url) => url.pathname === loginPath, async (route) => {
              await route.fulfill({ status: 502, contentType: 'text/plain', body: '' })
            })

            await login.goto()
            await login.submitCredentials(credentials.email, '')
            await expect(login.passwordError).toHaveText('Enter your password.')
            await expect(login.password).toHaveAttribute('aria-invalid', 'true')
            await expect(login.email).toHaveAttribute('aria-invalid', 'false')
            await expect(login.submit).toBeEnabled()
            await expect(login.formError).toBeHidden()
            await expect(page).toHaveURL(/\/login$/)
            expect(loginRequests, 'An empty password must not send a login request').toBe(0)
          })

          test('Incorrect password', async ({ credentials, page, login }) => {
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(credentials.email, `${credentials.password}-incorrect`)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })

          test('Correct password in a different case', async ({ credentials, page, login }) => {
            const password = credentials.password.toUpperCase()
            if (password === credentials.password) throw new Error('This case requires a runtime password with a lowercase letter.')
            await login.goto()
            const responsePromise = page.waitForResponse(isLoginResponse)
            await login.submitCredentials(credentials.email, password)
            const response = await responsePromise
            expect(response.status()).toBe(401)
            await expect(login.formError).toHaveText('Email or password is incorrect.')
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
          })
        })
      })

      test('Login service unavailable', async ({ credentials, page, login }) => {
        await page.route((url) => url.pathname === loginPath, async (route) => {
          await route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad Gateway</h1>' })
        })
        await login.goto()
        const responsePromise = page.waitForResponse(isLoginResponse)
        await login.submitCredentials(credentials.email, credentials.password)
        const response = await responsePromise
        expect(response.status()).toBe(502)
        await expect(login.formError).toHaveText('Could not sign in. Is the API running?')
        await expect(page).toHaveURL(/\/login$/)
        await expect(login.heading).toBeVisible()
      })
    })
  })
})
