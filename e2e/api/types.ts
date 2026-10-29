/** Wire contracts used by the suite; dates arrive as ISO strings. */
export interface Credentials {
  email: string
  password: string
}

/** Runtime-only data from the demo-account endpoint. Never persist this object. */
export interface DemoAccount extends Credentials {
  customer_id: string
  display_name: string
  scenario: string
}

export interface LoginResponse {
  customer_id: string
  display_name: string
  scenario: string
  access_token: string
}

export interface HouseholdSummary {
  customer_id: string
  label: string
  period: string
  daily_kwh: number[]
  daily_dates: string[]
  date_source: string
  region: string | null
  daily_peak_kwh: (number | null)[]
  daily_off_peak_kwh: (number | null)[]
  daily_night_kwh: (number | null)[]
  band_data_source: string | null
  total_kwh: number
  estimated_cost_nzd: number
}

export interface Fact {
  key: string
  value: number
  unit: string
  label: string
  display: string
}

export interface BillShockWarning {
  customer_id: string
  period: string
  triggered: boolean
  reasons: string[]
  days_elapsed: number
  days_in_cycle: number
  days_remaining: number
  usage_so_far_kwh: number
  cost_so_far_nzd: number
  projected_cycle_cost_nzd: number
  expected_cost_nzd: number
  expectation_basis: string
  overshoot_nzd: number
  overshoot_pct: number
  recent_trend_pct: number
  forecast: {
    method: string
    detail: string | null
    cost_p10_nzd: number
    cost_p90_nzd: number
    confidence_width_pct: number
    base_load_kwh_per_day: number | null
    heating_kwh_per_hdd: number | null
    r_squared: number | null
  }
  causes: {
    explained: boolean
    weather_nzd: number
    higher_use_nzd: number
    everyday_load_nzd: number
    dominant: string | null
  }
  thresholds_pct: Record<string, number>
  tier_probabilities: Record<string, number>
  facts: Fact[]
  caveats: string[]
}

export interface AlertPreferences {
  account_ref: string
  enabled: boolean
  tier1_pct: number
  tier2_pct: number
  tier3_pct: number
  min_overshoot_nzd: number
  email_enabled: boolean
  sms_enabled: boolean
  voice_enabled: boolean
  email: string | null
  phone_e164: string | null
  quiet_hours_start: number | null
  quiet_hours_end: number | null
  timezone: string
  offline_model_opt_in: boolean
  bill_reminders: boolean
  theme: 'light' | 'dark'
}

export interface CustomerProfile {
  customer_id: string
  name: string | null
  account_number: string | null
  address: string | null
  email: string | null
  phone: string | null
  plan_name: string | null
  user_type: string | null
  icp_number: string | null
  network_name: string | null
}

export interface BillingChargeLine {
  label: string
  quantity: string | null
  rate: string | null
  amount: number | null
}

export interface BillingInvoice {
  id: string
  issued: string | null
  period: string | null
  days: number | null
  due: string | null
  amount: number | null
  amount_due: number | null
  status: string
  charge_lines: BillingChargeLine[]
  gst: number | null
  previous_balance: number | null
  payments_and_credits: number | null
  late_payment_fee: number | null
}

export interface HouseholdBilling {
  customer: { id: string; name: string | null; address: string | null }
  current_plan: string | null
  invoices: BillingInvoice[]
}

export interface Plans {
  pricing_styles: {
    id: string
    name: string
    eyebrow: string
    rate: string
    rates: { label: string; value: string; unit: string; window: string | null }[]
    daily: string
    best_for: string
    highlights: string[]
  }[]
  commitment_terms: {
    id: string
    name: string
    price_treatment: string
    monthly_credit: string
    credit_note: string
    total_credit: string
    early_exit_fee: string
  }[]
  current_plan: { pricing_style: string | null; term: string | null }
  change_requests_available: boolean
  limitation: string
}

export interface UsageSeries {
  customer_id: string
  daily_dates: string[]
  daily_kwh: number[]
  daily_quality: ('measured' | 'estimated' | 'demo')[]
  daily_peak_kwh: (number | null)[]
  daily_off_peak_kwh: (number | null)[]
  daily_night_kwh: (number | null)[]
  band_data_source: string | null
  date_source: string
  total_kwh: number
  estimated_cost_nzd: number
  available_from: string | null
  available_to: string | null
}

export interface HourlyUsage {
  customer_id: string
  day: string
  timezone: string
  source: 'intervals' | 'demo' | 'unavailable'
  note: string
  hours: {
    start: string
    label: string
    kwh: number | null
    quality: 'measured' | 'estimated' | 'demo' | 'missing'
    intervals_received: number
    expected_intervals: number
  }[]
}

export interface AnnualDemand {
  customer_id: string
  available: boolean
  annual_kwh: number | null
  period_start: string | null
  period_end: string | null
  days_available: number
  days_required: number
  estimated_read_pct: number | null
  source: string
  note: string
}

export interface Health {
  status: string
  provider: string
  model: string
  model_ready: boolean
  recording: string
  data_source: string
  preferences: string
  plan_changes: string
}
