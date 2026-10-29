export type AccountKind = 'household' | 'data-platform' | 'generated'

export interface AccountMetadata {
  alias: string
  customerId: string
  displayName: string
  kind: AccountKind
  scenario: string
}

/** Stable test-design metadata; sign-in credentials are fetched at runtime. */
export const ACCOUNTS = [
  {
    alias: 'july', customerId: 'H-JUL', displayName: 'July Household', kind: 'household',
    scenario: "High standing load — the flagship 'why is my bill high' case.",
  },
  {
    alias: 'cold', customerId: 'H-COLD', displayName: 'Cold Snap Household', kind: 'household',
    scenario: 'Cold-snap driven, not behaviour. Completed July cycle; the alert also requires a $20 increase.',
  },
  {
    alias: 'spike', customerId: 'H-SPIKE', displayName: 'Spike Household', kind: 'household',
    scenario: "One genuine behavioural spike — good for 'which day was highest'.",
  },
  {
    alias: 'drop', customerId: 'H-DROP', displayName: 'Usage Collapse Household', kind: 'household',
    scenario: 'The hardship signal. Sparky recommends verified human support.',
  },
  {
    alias: 'tariff', customerId: 'H-TARIFF', displayName: 'Low User Household', kind: 'household',
    scenario: 'Low steady user, better off on another plan. Exercises the tariff check.',
  },
  {
    alias: 'julia', customerId: 'DEMO-ACCT-221001', displayName: 'Julia Fox', kind: 'data-platform',
    scenario: 'The printed-invoice fixture — August 2024.',
  },
  {
    alias: 'ana', customerId: 'DEMO-ACCT-222001', displayName: 'Ana Whitiora', kind: 'data-platform',
    scenario: 'Bill up because the house filled up.',
  },
  {
    alias: 'tama', customerId: 'DEMO-ACCT-223001', displayName: 'Tama Rewiri', kind: 'data-platform',
    scenario: 'Bill up on a cold snap — four months of history.',
  },
  {
    alias: 'mere', customerId: 'DEMO-ACCT-224001', displayName: 'Mere Kahu', kind: 'data-platform',
    scenario: 'A cylinder element stuck on — shows up in base load, not behaviour.',
  },
  {
    alias: 'josh', customerId: 'DEMO-ACCT-225001', displayName: 'Josh Fuller', kind: 'data-platform',
    scenario: 'A new appliance added mid-period.',
  },
  {
    alias: 'priya', customerId: 'DEMO-ACCT-226001', displayName: 'Priya Raman', kind: 'data-platform',
    scenario: 'Estimated reads — the explainer must hedge rather than assert.',
  },
  {
    alias: 'daniel', customerId: 'DEMO-ACCT-227001', displayName: 'Daniel Okafor', kind: 'data-platform',
    scenario: 'A longer billing period, not more usage. The classic false alarm.',
  },
  {
    alias: 'rangi', customerId: 'DEMO-ACCT-228001', displayName: 'Rangi Paterson', kind: 'data-platform',
    scenario: 'Thirteen months of history — the deepest account in the set.',
  },
  {
    alias: 'mereana', customerId: 'DEMO-ACCT-229001', displayName: 'Mereana Tipene', kind: 'data-platform',
    scenario: 'Mid-cycle, no bill issued yet. The forecast case.',
  },
  {
    alias: 'generated', customerId: 'A41636552', displayName: 'Generated Demo Household', kind: 'generated',
    scenario: 'Synthetic pipeline walkthrough: planted EV-shaped load and payment difficulty.',
  },
] as const satisfies readonly AccountMetadata[]

export type AccountAlias = (typeof ACCOUNTS)[number]['alias']
export type KnownAccount = (typeof ACCOUNTS)[number]

export function accountById(customerId: string): KnownAccount {
  const account = ACCOUNTS.find((candidate) => candidate.customerId === customerId)
  if (!account) throw new Error(`No test account is defined for ${customerId}.`)
  return account
}

export function accountByAlias(alias: AccountAlias): KnownAccount {
  const account = ACCOUNTS.find((candidate) => candidate.alias === alias)
  if (!account) throw new Error(`No test account is defined for alias ${alias}.`)
  return account
}
