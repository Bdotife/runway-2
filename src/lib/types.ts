export type Freq = 'week' | 'month' | 'term'
export type IncomeFreq = 'once' | 'week' | 'month'
export type DebtType = 'pay3' | 'pay4' | 'overdraft' | 'loan'
export type Step = 'signup' | 'consent' | 'onboard' | 'confirm' | 'app'
export type Status = 'ok' | 'tight' | 'over'

/** Form values are kept as strings while the person is typing. */
export type Num = number | string

export interface Cost {
  name: string
  cat: string
  amount: number
  freq: Freq
}

export interface DraftCost {
  name: string
  cat: string
  amount: Num
  freq: Freq
}

export interface Profile {
  opening: number
  nextAmount: number
  nextDate: string
  periodStart: string
  costs: Cost[]
}

export interface Draft {
  balance: Num | null
  nextAmount: Num | null
  nextDate: string | null
  costs: DraftCost[]
}

export interface Entry {
  id: string
  kind: 'spend' | 'income'
  amount: number
  cat: string
  freq?: IncomeFreq
  date: string
  t: number
  note?: string
}

/** The parts of an entry the budget engine needs. */
export type EntryLike = Pick<Entry, 'kind' | 'amount' | 'date'> & { cat?: string; freq?: IncomeFreq }

export interface Instalment {
  due: string
  amount: number
  paid: boolean
}

export interface Debt {
  id: string
  provider: string
  type: DebtType
  label: string
  principal: number
  apr: number
  free: number
  start: string
  instalments: Instalment[]
  total: number
  interest: number
}

export interface DebtDraft {
  provider: string
  type: DebtType
  amount: Num
  label: string
  start: string
  apr: Num
  months: Num
  free: Num
}

export interface Account {
  name: string
  uni: string
  email: string
  year: string
  invite?: string
  pw?: string
}

export interface ChatMsg {
  who: 'bot' | 'me'
  text: string
}

export interface State {
  session: boolean
  step: Step
  partner: string | null
  consent: { ai: boolean; data: boolean }
  chat: ChatMsg[]
  draft: Draft | null
  profile: Profile | null
  entries: Entry[]
  debts: Debt[]
  baseline: number
  studentLoan: { borrowed: number; salary: number }
  notify: boolean
  tipBnpl: boolean
  tipSeen: boolean
  account: Account | null
}

export interface Result {
  totalWeeks: number
  wl: number
  weekIdx: number
  weekStart: Date
  available: number
  free: number
  allowance: number
  left: number
  nextWeek: number
  status: Status
  spentWeek: Record<string, number>
  freeWeek: number
  coveredWeeks: number
  need: number
  next: Date
  start: Date
  debtOut: number
  due: boolean
}
