export const DAY = 864e5

export const today0 = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const iso = (d: Date | number | string): string => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export const parseIso = (s: string): Date => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const fmtDate = (d: Date | string): string =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export const round2 = (n: number): number => Math.round(n * 100) / 100

export const uid = (): string => Math.random().toString(36).slice(2, 9)

export const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Format pounds. Shows pence for small non-round amounts, or always when `pence` is true. */
export function gbp(n: number, pence = false): string {
  const neg = n < -0.004
  n = Math.abs(n || 0)
  const dp = pence || (n < 100 && Math.abs(n - Math.round(n)) > 0.004)
  const s = dp
    ? n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(n).toLocaleString('en-GB')
  return (neg ? '−' : '') + '£' + s
}

/** Parse a money-ish value ("£1,200", 12, "") into a number, or NaN. */
export const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? '').replace(/[£,\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

export const firstName = (name?: string | null): string => String(name || '').split(' ')[0]
