/*
 * Language parsing. In this prototype these rules stand in for the LLM layer:
 * they turn what the person types into amounts, dates, categories and intents.
 */
import { cap, iso, today0 } from './format'
import type { DebtDraft, DebtType, DraftCost, Freq } from './types'

const CAT_WORDS: [string, RegExp][] = [
  ['Rent', /\brent\b|landlord|halls/],
  ['Going out', /night out|going out|\bclub|\bpub\b|drinks|\bbar\b|party|cinema|\bgig|out tonight|friends/],
  ['Food', /food|grocer|tesco|aldi|lidl|sainsbury|asda|lunch|dinner|breakfast|meal|coffee|takeaway|snack/],
  ['Gym', /\bgym\b/],
  ['Bills', /phone|bill|utilit|electric|wifi|internet/],
  ['Transport', /uber|train|\bbus\b|taxi|travel|transport|petrol|railcard/],
  ['Course & tech', /laptop|book|course|equipment|stationery|printer|calculator|tablet|ipad/],
  ['Subscriptions', /netflix|spotify|subscription|prime|disney/],
  ['Clothes', /coat|clothes|jacket|shoes|trainers|hoodie|jeans/],
]

export function catOf(t: string): string {
  const lo = String(t).toLowerCase()
  for (const [c, r] of CAT_WORDS) if (r.test(lo)) return c
  return 'Other'
}

export const guessCat = (q: string, def: string): string => {
  const c = catOf(q)
  return c === 'Other' ? def : c
}

interface Amount {
  v: number
  i: number
  end: number
}

export function amounts(t: string): Amount[] {
  const out: Amount[] = []
  const re = /£\s?(\d[\d,]*(?:\.\d{1,2})?)(k\b)?|(\d[\d,]*(?:\.\d{1,2})?)\s?(?:pounds|quid)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    let v = parseFloat((m[1] || m[3]).replace(/,/g, ''))
    if (m[2]) v *= 1000
    out.push({ v, i: m.index, end: re.lastIndex })
  }
  const tn = t.search(/\ba tenner\b/i)
  if (tn >= 0) out.push({ v: 10, i: tn, end: tn + 8 })
  const fv = t.search(/\ba fiver\b/i)
  if (fv >= 0) out.push({ v: 5, i: fv, end: fv + 7 })
  return out.sort((a, b) => a.i - b.i)
}

export function freqAfter(t: string, end: number): Freq | null {
  const s = t.slice(end, end + 30).toLowerCase()
  if (/^\s*(a|per|each|every|\/)\s*(week|wk)|^\s*weekly/.test(s)) return 'week'
  if (/^\s*(a|per|each|every|\/)\s*(month|mo\b)|^\s*monthly/.test(s)) return 'month'
  if (/^\s*(a|per|each|every)\s*term|^\s*termly/.test(s)) return 'term'
  return null
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Finds a date like "8 January" or "Jan 8" and returns the next one after today. */
export function parseDate(t: string): string | null {
  let d: number
  let mo: number
  const m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i)
  if (m) {
    d = +m[1]
    mo = MONTHS.indexOf(m[2].toLowerCase())
  } else {
    const m2 = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/i)
    if (!m2) return null
    mo = MONTHS.indexOf(m2[1].toLowerCase())
    d = +m2[2]
  }
  const t0 = today0()
  let dt = new Date(t0.getFullYear(), mo, d)
  if (dt <= t0) dt = new Date(t0.getFullYear() + 1, mo, d)
  return iso(dt)
}

export interface SetupParse {
  balance: number | null
  nextAmount: number | null
  nextDate: string | null
  costs: DraftCost[]
}

export function parseSetup(text: string): SetupParse {
  const lo = text.toLowerCase()
  const am = amounts(text)
  const r: SetupParse = { balance: null, nextAmount: null, nextDate: parseDate(text), costs: [] }
  const used = new Set<number>()
  const kw = /(rent|food|groceries|gym|phone(?: bill)?|bills?|utilities|transport|travel|netflix|spotify|subscriptions?|going out|nights? out|bus pass|insurance)/g

  // Regular costs: an amount followed by "a week", "a month" or "a term".
  am.forEach((a, k) => {
    const f = freqAfter(text, a.end)
    if (!f) return
    const before = lo.slice(Math.max(0, a.i - 32), a.i)
    const after = lo.slice(a.end, a.end + 40)
    let label: string | null = null
    const bm = [...before.matchAll(kw)]
    if (bm.length) label = bm[bm.length - 1][1]
    else {
      const m2 = after.match(/\b(?:on|for)\s+(?:the\s+|my\s+)?([a-z][a-z ]{1,18}?)(?:[,.]|$|\s+and\b)/)
      if (m2) label = m2[1].trim()
    }
    if (!label) return
    used.add(k)
    const c = catOf(label)
    r.costs.push({ name: cap(label), cat: c === 'Other' ? cap(label) : c, amount: a.v, freq: f })
  })

  // Next loan payment: an amount near "next", "payment", "loan" and followed by a date.
  am.forEach((a, k) => {
    if (used.has(k) || r.nextAmount != null) return
    const ctx = lo.slice(Math.max(0, a.i - 50), a.end + 4)
    if (/next|maintenance|instal|payment|lands|loan/.test(ctx) && /\bon\b|\d{1,2}(st|nd|rd|th)?\s+[a-z]{3}|[a-z]{3}\s+\d/.test(lo.slice(a.end, a.end + 30))) {
      r.nextAmount = a.v
      used.add(k)
    }
  })

  // Fallback: an amount followed straight away by a date, e.g. "£3,200 on 8 January",
  // which is how people answer "when does your next payment land?".
  am.forEach((a, k) => {
    if (used.has(k) || r.nextAmount != null) return
    if (/^\s*(?:(?:lands|arrives|comes)\s+)?(?:on\s+)?(?:the\s+)?(\d{1,2}(st|nd|rd|th)?\s+(of\s+)?[a-z]{3}|[a-z]{3}\s+\d)/.test(lo.slice(a.end, a.end + 30))) {
      r.nextAmount = a.v
      used.add(k)
    }
  })

  // Balance: the first amount left over.
  am.forEach((a, k) => {
    if (used.has(k) || r.balance != null) return
    r.balance = a.v
    used.add(k)
  })
  return r
}

export type Intent = 'resource' | 'debt' | 'afford' | 'income' | 'spend'

export function intent(t: string): Intent {
  const lo = t.toLowerCase()
  if (/invest|shares|stocks?\b|crypto|bitcoin|pension|mortgage|\bisa\b|trading/.test(lo)) return 'resource'
  if (/klarna|clearpay|paypal (?:pay|credit)|laybuy|bnpl|buy now pay later|pay in (?:3|three|4|four)|overdraft|took (?:out )?a loan|loan from|borrowed|credit card/.test(lo)) return 'debt'
  if (/can i|could i|afford|should i|is it ok|ok to spend|enough for/.test(lo)) return 'afford'
  if (/earn|job|got paid|income|wage|salary|bursary|paid me|refund|birthday money/.test(lo)) return 'income'
  if (/spent|spend|bought|buy|paid|cost|£|\d/.test(lo)) return 'spend'
  return 'resource'
}

export function debtGuess(q: string, amt: number | ''): DebtDraft {
  const lo = q.toLowerCase()
  let type: DebtType = 'loan'
  let provider = 'Loan'
  if (/klarna/.test(lo)) { type = 'pay3'; provider = 'Klarna' }
  else if (/paypal/.test(lo)) { type = 'pay3'; provider = 'PayPal' }
  else if (/clearpay/.test(lo)) { type = 'pay4'; provider = 'Clearpay' }
  else if (/laybuy/.test(lo)) { type = 'pay4'; provider = 'Laybuy' }
  else if (/overdraft/.test(lo)) { type = 'overdraft'; provider = 'Overdraft' }
  else if (/pay in (3|three)/.test(lo)) { type = 'pay3'; provider = 'Pay in 3' }
  else if (/pay in (4|four)/.test(lo)) { type = 'pay4'; provider = 'Pay in 4' }
  if (/pay in (4|four)/.test(lo)) type = 'pay4'
  if (/pay in (3|three)/.test(lo) && type !== 'overdraft') type = 'pay3'
  const m = lo.match(/(laptop|phone|tablet|ipad|coat|trainers|headphones|textbooks?|books?|desk|bike|tv|console|jacket|camera)/)
  return {
    provider,
    type,
    amount: amt,
    label: m ? cap(m[1]) : '',
    start: iso(today0()),
    apr: type === 'overdraft' ? 39.9 : type === 'loan' ? 19.9 : '',
    months: 12,
    free: type === 'overdraft' ? 500 : '',
  }
}

export const shortNote = (q: string): string => (q.length > 46 ? q.slice(0, 44) + '…' : q)
