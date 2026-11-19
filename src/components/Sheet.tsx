import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXTRA_CATS } from '../lib/constants'
import { buildDebt, cashNow, compute } from '../lib/engine'
import { addDays, fmtDate, gbp, iso, num, parseIso, today0 } from '../lib/format'
import { shortNote } from '../lib/parse'
import type { DebtType, Result, State } from '../lib/types'
import { fresh, useStore, type Sheet as SheetT } from '../state/store'
import { STORAGE_KEY } from '../lib/constants'
import { StatusPill } from './Bits'
import { DateField, MoneyField, SelectField, TextField } from './Fields'

function Impact({ b, a, onlyNext }: { b: Result; a: Result; onlyNext?: boolean }) {
  return (
    <div className="impact">
      {!onlyNext && (
        <div className="imp-row">
          <span>Left this week</span>
          <span><span className="was">{gbp(b.left)}</span> → <strong>{gbp(a.left)}</strong></span>
        </div>
      )}
      <div className="imp-row">
        <span>{onlyNext ? 'Next week’s spending money' : 'Next week'}</span>
        <span><span className="was">{gbp(b.nextWeek)}</span> → <strong>{gbp(a.nextWeek)}</strong></span>
      </div>
      <div className="imp-row">
        <span>Status after</span>
        <StatusPill status={a.status} />
      </div>
    </div>
  )
}

const moneyHelper = <a href="https://www.moneyhelper.org.uk" target="_blank" rel="noopener">MoneyHelper</a>

/** The live "what would this do" preview under each sheet's fields. */
function Live({ s, S }: { s: SheetT; S: State }) {
  if (s.type === 'afford') {
    const amt = num(s.d.amount)
    if (!(amt > 0)) return <p className="muted">Enter an amount to see what it does to your week.</p>
    const b = compute(S)
    const a = compute(S, [{ kind: 'spend', amount: amt, cat: s.d.cat, date: iso(today0()) }])
    let sum: string
    if (a.status === 'over') sum = `Spending ${gbp(amt)} would mean your money runs short before ${fmtDate(a.next)} on your current plan.`
    else if (a.left < 0) sum = `That’s ${gbp(-a.left)} more than you have left this week, so next week drops to ${gbp(a.nextWeek)}.`
    else sum = `You’d have ${gbp(a.left)} left this week, and next week stays at ${gbp(a.nextWeek)}.`
    return (
      <>
        <Impact b={b} a={a} />
        <p className="summary">{sum}</p>
        <p className="handoff">This is information to help you decide. The decision is yours.</p>
      </>
    )
  }
  if (s.type === 'entry') {
    const amt = num(s.d.amount)
    if (!(amt > 0)) return <p className="muted">How much was it? Enter the amount to save it.</p>
    const e = s.d.kind === 'income'
      ? { kind: 'income' as const, amount: amt, freq: s.d.freq, date: iso(today0()) }
      : { kind: 'spend' as const, amount: amt, cat: s.d.cat, date: iso(today0()) }
    const b = compute(S)
    const a = compute(S, [e])
    return (
      <>
        <Impact b={b} a={a} />
        {s.d.kind !== 'income' && amt > S.baseline && (
          <p className="handoff">This is more than a week’s spending money, so Runway spreads it across the weeks until {fmtDate(a.next)}.</p>
        )}
      </>
    )
  }
  if (s.type === 'debt') {
    const d = s.d
    const amt = num(d.amount)
    if (!(amt > 0)) return <p className="muted">How much was it? Enter the amount to see the repayment plan.</p>
    const db = buildDebt(d)
    const b = compute(S)
    const a = compute(S, [], [db])
    const nextDate = parseIso(S.profile!.nextDate)
    const inPeriod = db.instalments.filter((i) => parseIso(i.due) <= nextDate).reduce((x, i) => x + i.amount, 0)
    let plan: ReactNode
    if (d.type === 'overdraft') {
      const over = Math.max(0, amt - (num(d.free) || 0))
      plan = (
        <div className="facts">
          <span>Above interest-free limit</span><span>{gbp(over)}</span>
          <span>Interest on that, about</span><span>{gbp((over * (num(d.apr) || 0)) / 100 / 12, true)} a month</span>
        </div>
      )
    } else {
      plan = (
        <>
          <ul className="sched">
            {db.instalments.slice(0, 6).map((i) => (
              <li key={i.due}>
                <span>{fmtDate(parseIso(i.due))}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{gbp(i.amount, true)}</span>
                <span />
              </li>
            ))}
            {db.instalments.length > 6 && (
              <li><span className="muted">and {db.instalments.length - 6} more</span><span /><span /></li>
            )}
          </ul>
          <div className="facts">
            <span>Total you’ll pay</span><span>{gbp(db.total, true)}</span>
            <span>Interest and fees</span><span>{gbp(db.interest, true)}</span>
            <span>Due before {fmtDate(nextDate)}</span><span>{gbp(inPeriod, true)}</span>
          </div>
        </>
      )
    }
    const kind = d.type === 'overdraft' ? 'overdrafts' : d.type === 'loan' ? 'loans' : 'buy now pay later'
    return (
      <>
        {plan}
        <Impact b={b} a={a} onlyNext />
        <p className="handoff">Runway sets aside each payment in the week it’s due. {moneyHelper} explains how {kind} work. The decision is yours.</p>
      </>
    )
  }
  if (s.type === 'rollover') {
    const got = num(s.d.amount) || 0
    const carry = cashNow(S)
    return (
      <div className="impact">
        <div className="imp-row"><span>Carried over</span><strong>{gbp(carry)}</strong></div>
        <div className="imp-row"><span>New starting amount</span><strong>{gbp(carry + got)}</strong></div>
      </div>
    )
  }
  return null
}

export function Sheet() {
  const { S, update, replace, sheet: s, setSheet, toast, addEntry, setOpenDebt } = useStore()
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const open = s?.type

  // Focus the first empty field, or the main button, when a sheet opens.
  useEffect(() => {
    if (!open || !box.current) return
    const empty = [...box.current.querySelectorAll<HTMLInputElement>('input.inp:not([type=date])')].find((i) => !i.value)
    const target = empty || box.current.querySelector<HTMLElement>('.btn-primary') || box.current.querySelector<HTMLElement>('button')
    target?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setSheet])

  if (!s) return null
  const close = () => setSheet(null)
  /** Update one field of the open sheet's form. */
  const set = (k: string, v: string) => setSheet({ ...s, d: { ...(s as { d: object }).d, [k]: v } } as SheetT)
  const catOpts = [...new Set((S.profile ? S.profile.costs.map((c) => c.cat) : []).concat(EXTRA_CATS))]
  const raw = 'raw' in s ? s.raw : ''

  let title = ''
  let body: ReactNode = null
  let actions: ReactNode = null
  let one = false

  if (s.type === 'afford') {
    title = 'Before you spend'
    body = (
      <div className="two">
        <MoneyField id="sf-amount" label="Amount" value={s.d.amount} onChange={(v) => set('amount', v)} />
        <SelectField id="sf-cat" label="Comes from" value={s.d.cat} options={catOpts} onChange={(v) => set('cat', v)} />
      </div>
    )
    actions = (
      <>
        <button className="btn btn-ghost" onClick={() => { close(); toast('Skipped. Nothing was logged.') }}>Skip it</button>
        <button className="btn btn-primary" onClick={() => {
          const amt = num(s.d.amount)
          if (!(amt > 0)) return toast('Enter an amount first.')
          addEntry({ kind: 'spend', amount: amt, cat: s.d.cat, note: shortNote(raw) })
          close()
          toast(`Logged ${gbp(amt)} to ${s.d.cat}`)
        }}>I’m going ahead</button>
      </>
    )
  } else if (s.type === 'entry') {
    const inc = s.d.kind === 'income'
    title = inc ? 'Add this income' : 'Log this spend'
    body = (
      <div className="two">
        <MoneyField id="sf-amount" label="Amount" value={s.d.amount} onChange={(v) => set('amount', v)} />
        {inc ? (
          <SelectField id="sf-freq" label="How often" value={s.d.freq} options={[['once', 'Just once'], ['week', 'Every week'], ['month', 'Every month']]} onChange={(v) => set('freq', v)} />
        ) : (
          <SelectField id="sf-cat" label="Category" value={s.d.cat} options={catOpts} onChange={(v) => set('cat', v)} />
        )}
      </div>
    )
    actions = (
      <>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-primary" onClick={() => {
          const amt = num(s.d.amount)
          if (!(amt > 0)) return toast('Enter an amount first.')
          if (inc) addEntry({ kind: 'income', amount: amt, freq: s.d.freq, cat: 'Income', note: shortNote(s.d.note) })
          else addEntry({ kind: 'spend', amount: amt, cat: s.d.cat, note: shortNote(s.d.note) })
          close()
          toast(inc ? `Added ${gbp(amt)}${s.d.freq !== 'once' ? ' a ' + s.d.freq : ''} income` : `Logged ${gbp(amt)} to ${s.d.cat}`)
        }}>{inc ? 'Add income' : 'Log spend'}</button>
      </>
    )
  } else if (s.type === 'debt') {
    const d = s.d
    title = 'Before you add this debt'
    const setType = (v: string) => {
      const t = v as DebtType
      const extra = t === 'overdraft' ? { apr: 39.9, free: 500 } : t === 'loan' ? { apr: 19.9, months: 12 } : {}
      setSheet({ ...s, d: { ...d, type: t, ...extra } })
    }
    body = (
      <>
        <div className="two">
          <TextField id="sf-provider" label="Provider" value={d.provider} onChange={(v) => set('provider', v)} />
          <SelectField id="sf-type" label="Type" value={d.type} options={[['pay3', 'Pay in 3, monthly'], ['pay4', 'Pay in 4, every 2 weeks'], ['overdraft', 'Overdraft'], ['loan', 'Loan, monthly']]} onChange={setType} />
        </div>
        <div className="two">
          <MoneyField id="sf-amount" label={d.type === 'overdraft' ? 'Overdrawn by' : 'Amount'} value={d.amount} onChange={(v) => set('amount', v)} />
          <DateField id="sf-start" label="First payment" value={d.start} onChange={(v) => set('start', v)} />
        </div>
        {d.type === 'loan' && (
          <div className="two">
            <TextField id="sf-apr" label="Interest (APR %)" value={d.apr} numeric onChange={(v) => set('apr', v)} />
            <TextField id="sf-months" label="Months to repay" value={d.months} numeric onChange={(v) => set('months', v)} />
          </div>
        )}
        {d.type === 'overdraft' && (
          <div className="two">
            <MoneyField id="sf-free" label="Interest-free up to" value={d.free} onChange={(v) => set('free', v)} />
            <TextField id="sf-apr" label="Interest above that (APR %)" value={d.apr} numeric onChange={(v) => set('apr', v)} />
          </div>
        )}
      </>
    )
    actions = (
      <>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-primary" onClick={() => {
          if (!(num(d.amount) > 0)) return toast('Enter an amount first.')
          const db = buildDebt(d)
          update((x) => {
            x.debts.push(db)
            if (d.type !== 'overdraft' && d.type !== 'loan') x.tipBnpl = true
          })
          close()
          setOpenDebt(db.id)
          navigate('/debts')
          toast(`${db.provider} added to your tracker`)
        }}>Add to my tracker</button>
      </>
    )
  } else if (s.type === 'resource') {
    title = 'That’s outside what Runway covers'
    one = true
    body = (
      <>
        <p className="summary">Runway helps with budgeting and keeping track of debt. It can’t tell you whether to invest, borrow or buy a financial product. These official sources explain your options:</p>
        <ul className="res">
          <li><a href="https://www.moneyhelper.org.uk" target="_blank" rel="noopener">MoneyHelper</a><span>Free, government-backed guidance on saving, investing and borrowing</span></li>
          <li><a href="https://register.fca.org.uk" target="_blank" rel="noopener">FCA Register</a><span>Check whether a firm is authorised before you use it</span></li>
          <li><a href="https://www.actionfraud.police.uk" target="_blank" rel="noopener">Action Fraud</a><span>Report or check a suspected scam</span></li>
        </ul>
        <p className="handoff">The decision is yours. If you’re unsure, consider speaking to a qualified professional.</p>
      </>
    )
    actions = <button className="btn btn-ghost" onClick={close}>Done</button>
  } else if (s.type === 'rollover') {
    title = 'Your loan payment arrived'
    body = (
      <>
        <MoneyField id="sf-amount" label="Amount you received" value={s.d.amount} onChange={(v) => set('amount', v)} />
        <div className="two">
          <DateField id="sf-nextDate" label="Next payment lands on" value={s.d.nextDate} onChange={(v) => set('nextDate', v)} />
          <MoneyField id="sf-nextAmount" label="Next payment amount" value={s.d.nextAmount} onChange={(v) => set('nextAmount', v)} />
        </div>
      </>
    )
    actions = (
      <>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-primary" onClick={() => {
          const got = num(s.d.amount)
          if (!(got >= 0)) return toast('Enter the amount you received.')
          if (!s.d.nextDate || parseIso(s.d.nextDate) <= today0()) return toast('Pick a next payment date after today.')
          const carry = cashNow(S)
          const t = iso(today0())
          update((x) => {
            const P = x.profile!
            P.opening = carry + got
            P.periodStart = t
            P.nextDate = s.d.nextDate
            P.nextAmount = num(s.d.nextAmount) || P.nextAmount
            // Repeating income carries over; one-off entries belong to the old period.
            x.entries = x.entries.filter((e) => e.kind === 'income' && e.freq !== 'once').map((e) => ({ ...e, date: t }))
            x.debts.forEach((db) => db.instalments.forEach((i) => { if (parseIso(i.due) <= today0()) i.paid = true }))
            x.baseline = compute(x).allowance
          })
          close()
          navigate('/home')
          toast(`New period started with ${gbp(carry)} carried over`)
        }}>Start new period</button>
      </>
    )
  } else if (s.type === 'delete') {
    title = 'Delete your data?'
    body = <p className="summary">This removes your budget, entries and debts from Runway on this device. You can’t undo this.</p>
    actions = (
      <>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-danger" onClick={() => {
          close()
          // Leave the app first, so the signed-in guard doesn't redirect to sign-up.
          navigate('/')
          window.setTimeout(() => {
            try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
            replace(fresh())
            window.scrollTo(0, 0)
            toast('Your data has been deleted')
          })
        }}>Delete my data</button>
      </>
    )
  } else if (s.type === 'copy') {
    title = 'Your data'
    one = true
    body = (
      <>
        <label className="lbl" htmlFor="dump">Select all and copy</label>
        <textarea id="dump" className="inp" readOnly value={JSON.stringify({ profile: S.profile, entries: S.entries, debts: S.debts }, null, 2)} />
      </>
    )
    actions = <button className="btn btn-ghost" onClick={close}>Done</button>
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={box}>
        <span className="grab" aria-hidden="true" />
        <h2 className="sheet-title" id="sheet-title">{title}</h2>
        {raw && <p className="heard">You said “{raw}”</p>}
        {body}
        <div id="live"><Live s={s} S={S} /></div>
        {s.type === 'rollover' && <p className="handoff">Your regular costs and debts carry over. Only the dates change.</p>}
        <div className={`sheet-actions ${one ? 'one' : ''}`}>{actions}</div>
      </div>
    </div>
  )
}

/** Opens the "loan payment arrived" sheet with sensible defaults. */
export function rolloverSheet(S: State): SheetT {
  const P = S.profile!
  return { type: 'rollover', d: { amount: P.nextAmount, nextDate: iso(addDays(parseIso(P.nextDate), 112)), nextAmount: P.nextAmount } }
}
