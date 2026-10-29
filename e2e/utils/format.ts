/** Display formatting only; expected amounts must come from the API or another page. */
export const formatNzd = (value: number): string => `${value.toFixed(2)} NZD`

export const formatDollars = (value: number | null | undefined): string =>
  value == null ? 'Not available' : `$${value.toFixed(2)}`

export const formatKwh = (value: number, decimals = 1): string => `${value.toFixed(decimals)} kWh`

export const formatPercent = (value: number, decimals = 0): string => `${value.toFixed(decimals)}%`
