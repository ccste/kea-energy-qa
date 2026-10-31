import { expect } from '@playwright/test'
import type { BillShockPanel } from '../../pages/components/BillShockPanel'
import type { BillShockWarning } from '../../api/types'
import { formatNzd, formatPercent } from '../../utils/format'

export const BASIS_NOTES: Record<string, string> = {
  own_recent_cycles: 'Compared with your own average across recent billing periods.',
  own_same_period_last_year: 'Compared with your own bill for the same period last year.',
  comparable_homes: 'Compared with similar homes — there is not yet a full billing period of your own to compare against.',
}

export async function expectPanelState(panel: BillShockPanel, state: 'warning' | 'normal' | 'unavailable'): Promise<void> {
  const expected = {
    warning: { className: 'alert', label: 'Bill shock warning active', heading: 'Power Bill Shock Warning' },
    normal: { className: 'normal', label: 'No bill shock expected', heading: 'No bill shock expected' },
    unavailable: { className: 'unavailable', label: 'Bill shock assessment unavailable', heading: 'Usage data unavailable' },
  }[state]
  await expect.soft(panel.chip).toHaveClass(new RegExp(`\\benergy-home-alert-trigger--${expected.className}\\b`))
  await expect.soft(panel.chip).toHaveAccessibleName(new RegExp(expected.label))
  await expect.soft(panel.heading).toHaveText(expected.heading)
  if (state !== 'unavailable') {
    await expect.soft(panel.statusDot).toHaveClass(new RegExp(`\\bbill-status-dot-${expected.className}\\b`))
    await expect.soft(panel.statusDot).toHaveCSS('background-color', state === 'warning' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)')
  }
}

export function warningSummary(shock: BillShockWarning): string {
  return `You are ${shock.days_elapsed} of ${shock.days_in_cycle} days into this cycle and on track for ${formatNzd(shock.projected_cycle_cost_nzd)}. You would normally expect about ${formatNzd(shock.expected_cost_nzd)} — that is ${formatNzd(shock.overshoot_nzd)} more, or ${formatPercent(shock.overshoot_pct)}.`
}
