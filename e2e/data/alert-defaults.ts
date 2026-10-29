import type { AlertPreferences } from '../api/types'

type ManagedAlertPreferences = Omit<AlertPreferences, 'account_ref' | 'email' | 'phone_e164'>

/** Reset managed settings without overwriting an account's contact details. */
export const DEFAULT_ALERT_PREFERENCES = {
  enabled: true,
  tier1_pct: 15,
  tier2_pct: 40,
  tier3_pct: 75,
  min_overshoot_nzd: 20,
  email_enabled: true,
  sms_enabled: true,
  voice_enabled: false,
  quiet_hours_start: 21,
  quiet_hours_end: 8,
  timezone: 'Pacific/Auckland',
  offline_model_opt_in: false,
  bill_reminders: true,
  theme: 'light',
} as const satisfies ManagedAlertPreferences
