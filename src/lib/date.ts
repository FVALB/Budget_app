// Date utilities — all dates are ISO strings (YYYY-MM-DD) in the DB

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentYear(): number {
  return new Date().getFullYear()
}

export function currentMonth(): number {
  return new Date().getMonth() + 1
}

export function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function monthEnd(year: number, month: number): string {
  const d = new Date(year, month, 0) // last day of month
  return d.toISOString().slice(0, 10)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

export function dayOfMonth(iso: string): number {
  return isoToDate(iso).getDate()
}

export function formatDisplayDate(iso: string): string {
  return isoToDate(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string): string {
  return isoToDate(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

// Returns an array of ISO date strings for every day in the given month
export function monthDays(year: number, month: number): string[] {
  const count = daysInMonth(year, month)
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
}

// Previous month (handles year rollover)
export function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}
