/*
 * Budget engine. Deterministic: every number Runway shows comes from here, never from the AI.
 */
import { addDays, DAY, iso, num, parseIso, round2, today0, uid } from './format'
import type { Cost, Debt, DebtDraft, DraftCost, EntryLike, Instalment, Result, State, Status } from './types'

/** Weekly cost of a regular payment. */
export function weekly(c: Cost | DraftCost): number {
  const a = num(c.amount) || 0
  return c.freq === 'week' ? a : c.freq === 'month' ? (a * 12) / 52 : c.freq === 'term' ? a / 13 : a / 52
}

/** Turns a debt form into a debt with a repayment schedule. */
export function buildDebt(d: DebtDraft): Debt {
  const amt = num(d.amount) || 0
  const start = parseIso(d.start || iso(today0()))
  const ins: Omit<Instalment, 'paid'>[] = []
  if (d.type === 'pay3') {
    for (let i = 0; i < 3; i++) ins.push({ due: iso(addDays(start, 30 * i)), amount: round2(amt / 3) })
  } else if (d.type === 'pay4') {
    for (let i = 0; i < 4; i++) ins.push({ due: iso(addDays(start, 14 * i)), amount: round2(amt / 4) })
  } else if (d.type === 'loan') {
    const n = Math.max(1, Math.round(num(d.months) || 12))
    const r = (num(d.apr) || 0) / 100 / 12
    const pay = r ? (amt * r) / (1 - Math.pow(1 + r, -n)) : amt / n
    for (let i = 1; i <= n; i++) ins.push({ due: iso(addDays(start, 30 * i)), amount: round2(pay) })
  }
  // Put any rounding difference on the last instalment so BNPL plans add up exactly.
  if (ins.length && d.type !== 'loan') {
    const diff = round2(amt - ins.reduce((a, b) => a + b.amount, 0))
    ins[ins.length - 1].amount = round2(ins[ins.length - 1].amount + diff)
  }
  const total = ins.reduce((a, b) => a + b.amount, 0)
  return {
    id: uid(),
    provider: d.provider || 'Debt',
    type: d.type,
    label: d.label || '',
    principal: amt,
    apr: num(d.apr) || 0,
    free: num(d.free) || 0,
    start: d.start,
    instalments: ins.map((x) => ({ ...x, paid: false })),
    total: round2(total),
    interest: round2(Math.max(0, total - amt)),
  }
}

/**
 * Works out this week's spending money, next week's, and the status.
 * Pass extra entries or debts to preview "what if" without saving them.
 */
export function compute(S: State, extraEntries: EntryLike[] = [], extraDebts: Debt[] = []): Result {
  const P = S.profile
  if (!P) throw new Error('compute() needs a profile')
  const t0 = today0()
  const start = parseIso(P.periodStart)
  const next = parseIso(P.nextDate)
  const totalWeeks = Math.max(1, (+next - +start) / (7 * DAY))
  const wl = Math.max(1, (+next - +t0) / (7 * DAY))
  const weekIdx = Math.min(Math.ceil(totalWeeks) - 1, Math.max(0, Math.floor((+t0 - +start) / (7 * DAY))))
  const weekStart = addDays(start, weekIdx * 7)
  const entries: EntryLike[] = [...S.entries, ...extraEntries]
  const debts = [...S.debts, ...extraDebts]
  const committed = new Set(P.costs.map((c) => c.cat))

  let spends = 0
  let incomes = 0
  let freeWeek = 0
  let futureIncome = 0
  const spentPeriod: Record<string, number> = {}
  const spentWeek: Record<string, number> = {}

  for (const e of entries) {
    const d = parseIso(e.date)
    const cat = e.cat || 'Other'
    if (e.kind === 'income') {
      if (e.freq === 'once' || !e.freq) incomes += e.amount
      else {
        const w = e.freq === 'week' ? e.amount : (e.amount * 12) / 52
        const from = Math.max(+t0, +d)
        futureIncome += w * Math.max(0, (+next - from) / (7 * DAY))
      }
      continue
    }
    spends += e.amount
    spentPeriod[cat] = (spentPeriod[cat] || 0) + e.amount
    if (d >= weekStart) {
      spentWeek[cat] = (spentWeek[cat] || 0) + e.amount
      // Big one-offs (more than a week's money) are spread over the period, not this week.
      if (!committed.has(cat) && !(S.baseline > 0 && e.amount > S.baseline)) freeWeek += e.amount
    }
  }

  let debtOut = 0
  for (const db of debts)
    for (const ins of db.instalments) {
      const d = parseIso(ins.due)
      if (d >= start && d <= next) debtOut += ins.amount
    }

  const available = P.opening + incomes + futureIncome - spends - debtOut
  let reserved = 0
  for (const c of P.costs) reserved += Math.max(0, weekly(c) * totalWeeks - (spentPeriod[c.cat] || 0))
  const free = available - reserved
  const allowance = (free + freeWeek) / wl
  const left = allowance - freeWeek
  const nextWeek = (free - Math.max(left, 0)) / Math.max(1, wl - 1)
  const need = P.costs.reduce((a, c) => a + weekly(c), 0)
  const coveredWeeks =
    free >= 0 ? totalWeeks : need > 0 ? Math.max(0, (+t0 - +start) / (7 * DAY) + Math.max(0, available) / need) : 0

  let status: Status = 'ok'
  if (free < 0) status = 'over'
  else if (left < 0 || nextWeek < S.baseline * 0.8) status = 'tight'

  return { totalWeeks, wl, weekIdx, weekStart, available, free, allowance, left, nextWeek, status, spentWeek, freeWeek, coveredWeeks, need, next, start, debtOut, due: t0 >= next }
}

/** Cash in hand today: opening amount, plus one-off income, minus spending and debt payments already due. */
export function cashNow(S: State): number {
  const P = S.profile
  if (!P) return 0
  let c = P.opening
  for (const e of S.entries) {
    if (e.kind === 'income') {
      if (e.freq === 'once') c += e.amount
    } else c -= e.amount
  }
  const start = parseIso(P.periodStart)
  const t0 = today0()
  for (const d of S.debts)
    for (const i of d.instalments) {
      const dd = parseIso(i.due)
      if (dd >= start && dd <= t0) c -= i.amount
    }
  return c
}

/** Plan 5 student loan: 9% of income above £25,000, per month. */
export const studentLoanMonthly = (salary: number): number => Math.max(0, ((salary - 25000) * 0.09) / 12)

/** Hashes a password before it is stored. Prototype only: real accounts belong on a server. */
export async function hashPw(pw: string): Promise<string> {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('runway:' + pw))
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
  } catch {
    let x = 7
    for (const c of 'runway:' + pw) x = (x * 31 + c.charCodeAt(0)) | 0
    return 'h' + x
  }
}
