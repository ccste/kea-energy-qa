import type { APIRequestContext, APIResponse } from '@playwright/test'
import { DEFAULT_ALERT_PREFERENCES } from '../data/alert-defaults'
import type {
  AlertPreferences,
  AnnualDemand,
  BillShockWarning,
  Credentials,
  CustomerProfile,
  DemoAccount,
  Health,
  HourlyUsage,
  HouseholdBilling,
  HouseholdSummary,
  LoginResponse,
  Plans,
  UsageSeries,
} from './types'

/** Account data provides independent expected values for browser tests. */
export class KeaApi {
  constructor(private readonly request: APIRequestContext) {}

  demoAccounts(): Promise<DemoAccount[]> {
    return this.get('/api/auth/demo-accounts')
  }

  login(credentials: Credentials): Promise<LoginResponse> {
    return this.send('POST', '/api/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
  }

  household(customerId: string): Promise<HouseholdSummary> {
    return this.get(this.accountPath(customerId))
  }

  billShock(customerId: string, asAtDay?: number): Promise<BillShockWarning> {
    const query = asAtDay === undefined ? '' : `?as_at_day=${asAtDay}`
    return this.get(`${this.accountPath(customerId)}/bill-shock${query}`)
  }

  profile(customerId: string): Promise<CustomerProfile> {
    return this.get(`${this.accountPath(customerId)}/profile`)
  }

  billing(customerId: string): Promise<HouseholdBilling> {
    return this.get(`${this.accountPath(customerId)}/billing`)
  }

  plans(customerId: string): Promise<Plans> {
    return this.get(`${this.accountPath(customerId)}/plans`)
  }

  usageSeries(customerId: string, range: { start: string; end: string }): Promise<UsageSeries> {
    const query = new URLSearchParams(range)
    return this.get(`${this.accountPath(customerId)}/usage-series?${query}`)
  }

  hourlyUsage(customerId: string, day: string): Promise<HourlyUsage> {
    const query = new URLSearchParams({ day })
    return this.get(`${this.accountPath(customerId)}/hourly-usage?${query}`)
  }

  annualDemand(customerId: string): Promise<AnnualDemand> {
    return this.get(`${this.accountPath(customerId)}/annual-demand`)
  }

  health(): Promise<Health> {
    return this.get('/api/health')
  }

  alertPreferences(customerId: string): Promise<AlertPreferences> {
    return this.get(`${this.accountPath(customerId)}/alert-preferences`)
  }

  async resetAlertPreferences(customerId: string, token: string): Promise<AlertPreferences> {
    if (!token.trim()) throw new Error('A sign-in token is required to reset alert preferences.')
    const path = `${this.accountPath(customerId)}/alert-preferences`
    const existing = await this.get<AlertPreferences>(path, token)
    return this.send('PUT', path, {
      ...existing,
      ...DEFAULT_ALERT_PREFERENCES,
      account_ref: customerId,
    }, token)
  }

  private accountPath(customerId: string): string {
    return `/api/households/${encodeURIComponent(customerId)}`
  }

  private get<T>(path: string, token?: string): Promise<T> {
    return this.send('GET', path, undefined, token)
  }

  private async send<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    data?: unknown,
    token?: string,
  ): Promise<T> {
    let response: APIResponse
    try {
      response = await this.request.fetch(path, {
        method,
        ...(data === undefined ? {} : { data }),
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        failOnStatusCode: false,
      })
    } catch {
      // Request diagnostics can contain credentials or authorization headers.
      throw new Error(`${method} ${path} did not complete.`)
    }

    try {
      if (!response.ok()) {
        throw new Error(`${method} ${path} returned HTTP ${response.status()}.`)
      }
      try {
        return await response.json() as T
      } catch {
        throw new Error(`${method} ${path} did not return valid JSON.`)
      }
    } finally {
      await response.dispose()
    }
  }
}
