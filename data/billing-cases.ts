import { accountByAlias } from './accounts'

/** The nine invoice-bearing accounts named in the approved Billing design. */
export const BILLING_ACCOUNTS = ([
  'ana', 'tama', 'mere', 'josh', 'priya', 'daniel', 'rangi', 'mereana', 'generated',
] as const).map(accountByAlias)

/** Independent printed-invoice fixture: do not replace it with the Billing API response. */
export const JULIA_INVOICE = {
  id: 'DEMO-INV-20240831',
  period: '2024-08-08 – 2024-08-31',
  total: '$50.54',
  customer: 'Julia Fox',
  address: '1 Alpha Road, Deltaville',
} as const
