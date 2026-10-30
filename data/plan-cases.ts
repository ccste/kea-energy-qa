/** Design identifiers select catalogue entries; prices are read independently at runtime. */
export const PRICING_STYLES = [
  { id: 'anytime', name: 'Anytime Rate' },
  { id: 'time-of-use', name: 'Time of Use' },
  { id: 'free-weekends', name: 'Free Weekends' },
] as const

export const COMMITMENT_TERMS = [
  { id: 'flexible', name: 'Flexible' },
  { id: '6-months', name: '6 months' },
  { id: '12-months', name: '12 months' },
] as const

export const PLAN_REQUEST_CONFIRMATION =
  'Plan request recorded for Customer Care review. Your current plan remains active.'
