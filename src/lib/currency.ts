const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCents(cents: number): string {
  return EUR.format(cents / 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

export function isPositive(cents: number): boolean {
  return cents > 0
}

export function isNegative(cents: number): boolean {
  return cents < 0
}

export function absFormatCents(cents: number): string {
  return EUR.format(Math.abs(cents) / 100)
}
