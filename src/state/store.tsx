import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { STORAGE_KEY } from '../lib/constants'
import { iso, today0, uid } from '../lib/format'
import type { DebtDraft, Entry, IncomeFreq, Num, State, Step } from '../lib/types'

/* ---------- saved state ---------- */

export const fresh = (): State => ({
  session: false,
  step: 'signup',
  partner: null,
  consent: { ai: false, data: false },
  chat: [],
  draft: null,
  profile: null,
  entries: [],
  debts: [],
  baseline: 0,
  studentLoan: { borrowed: 16540, salary: 30000 },
  notify: true,
  tipBnpl: false,
  tipSeen: false,
  account: null,
})

function load(): State {
  let saved: Partial<State> & { step?: string } = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) saved = JSON.parse(raw)
  } catch {
    /* storage unavailable: start fresh */
  }
  const S: State = { ...fresh(), ...saved } as State
  if ((S.step as string) === 'welcome') S.step = 'signup'
  if (S.step === 'app' && !S.profile) S.step = 'onboard'
  // Older budgets made before accounts existed are opened without a password.
  if (S.profile && !(S.account && S.account.pw)) S.session = true
  return S
}

/* ---------- bottom sheets ---------- */

export type Sheet =
  | { type: 'afford'; raw: string; d: { amount: Num; cat: string } }
  | { type: 'entry'; raw: string; d: { kind: 'spend' | 'income'; amount: Num; cat: string; freq: IncomeFreq; note: string } }
  | { type: 'debt'; raw: string; d: DebtDraft }
  | { type: 'resource'; raw: string }
  | { type: 'rollover'; d: { amount: Num; nextDate: string; nextAmount: Num } }
  | { type: 'delete' }
  | { type: 'copy' }

/* ---------- context ---------- */

interface Store {
  S: State
  /** Change saved state. The callback gets a copy it can modify. */
  update: (fn: (s: State) => void) => void
  replace: (s: State) => void
  toastMsg: string
  toastOn: boolean
  toast: (msg: string) => void
  sheet: Sheet | null
  setSheet: (s: Sheet | null) => void
  openDebt: string | null
  setOpenDebt: (id: string | null) => void
  addEntry: (e: Omit<Entry, 'id' | 'date' | 't'>) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<State>(load)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [openDebt, setOpenDebt] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastOn, setToastOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(S))
    } catch {
      /* ignore */
    }
  }, [S])

  const update = useCallback((fn: (s: State) => void) => {
    setS((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    setToastOn(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastOn(false), 2800)
  }, [])

  const addEntry = useCallback(
    (e: Omit<Entry, 'id' | 'date' | 't'>) =>
      update((s) => {
        s.entries.push({ ...e, id: uid(), date: iso(today0()), t: Date.now() })
      }),
    [update],
  )

  const value = useMemo<Store>(
    () => ({ S, update, replace: setS, toastMsg, toastOn, toast, sheet, setSheet, openDebt, setOpenDebt, addEntry }),
    [S, update, toastMsg, toastOn, toast, sheet, openDebt, addEntry],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}

/* ---------- routing helpers ---------- */

export const STEP_ROUTE: Record<Step, string> = {
  signup: '/signup',
  consent: '/onboarding/consent',
  onboard: '/onboarding/setup',
  confirm: '/onboarding/confirm',
  app: '/home',
}

/** Where someone should be sent, given how far through the journey they are. */
export function whereTo(S: State): string {
  if (!S.session) return S.account && S.account.pw ? '/signin' : '/signup'
  return STEP_ROUTE[S.step]
}
