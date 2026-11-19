import type { JSX } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand, CatRow, RunwayStrip, StatusPill } from '../components/Bits'
import { Composer, useAsk } from '../components/Composer'
import { DebtsIcon, HomeIcon, MeIcon, XIcon } from '../components/Icons'
import { rolloverSheet } from '../components/Sheet'
import { compute, studentLoanMonthly, weekly } from '../lib/engine'
import { firstName, fmtDate, gbp, num, parseIso, today0 } from '../lib/format'
import type { Debt } from '../lib/types'
import { useStore } from '../state/store'

/** Top bar, scrolling content, composer and tab bar shared by Home, Debts and You. */
export function AppLayout() {
  const { S } = useStore()
  const ask = useAsk()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const P = S.profile!
  const tabs: [string, string, () => JSX.Element][] = [
    ['/home', 'Home', HomeIcon],
    ['/debts', 'Debts', DebtsIcon],
    ['/account', 'You', MeIcon],
  ]
  return (
    <div className="col">
      <header className="top">
        <Brand />
        <span className="top-note">{S.partner ? `Free through ${S.partner}` : `Next loan ${fmtDate(parseIso(P.nextDate))}`}</span>
      </header>
      <main className="main" key={pathname}>
        <Outlet />
      </main>
      {pathname !== '/account' && <Composer mode="app" onSubmit={ask} />}
      <nav className="nav" aria-label="Main">
        {tabs.map(([to, label, Icon]) => (
          <button key={to} onClick={() => navigate(to)} aria-current={pathname === to ? 'page' : undefined}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export function Home() {
  const { S, update, setSheet, toast } = useStore()
  const r = compute(S)
  const P = S.profile!
  const reason =
    r.status === 'ok'
      ? `At this pace your money lasts until ${fmtDate(r.next)}.`
      : r.status === 'tight'
        ? 'You’ve spent more than planned, so next week has less in it.'
        : `At this pace your money runs short before ${fmtDate(r.next)}.`
  const al = Math.max(0, r.allowance)
  const list = S.entries.slice().sort((a, b) => (b.date + b.t > a.date + a.t ? 1 : -1)).slice(0, 10)

  return (
    <>
      <section className="hero">
        <p className="figure-label">Left to spend this week</p>
        <p className={`figure ${r.left < 0 ? 'neg' : ''}`}>{gbp(Math.round(r.left))}</p>
        <div className="hero-meta">
          <StatusPill status={r.status} />
          <span>Next week: {gbp(Math.round(r.nextWeek))}</span>
        </div>
        <RunwayStrip r={r} nextAmount={P.nextAmount} />
        <p className="reason">{reason}</p>
      </section>

      {r.due && (
        <div className="banner">
          <p><strong>Has your {gbp(P.nextAmount)} loan payment arrived?</strong> Confirm it to start your next period.</p>
          <button className="btn btn-primary btn-block" onClick={() => setSheet(rolloverSheet(S))}>Confirm payment</button>
        </div>
      )}
      {r.status === 'over' && (
        <div className="banner warn">
          <p><strong>Money looks short before {fmtDate(r.next)}.</strong> Your university’s hardship fund and student money advice team can help, and asking is free.</p>
          <div className="links">
            <a href="https://www.gov.uk/extra-money-pay-university" target="_blank" rel="noopener">Hardship funds on GOV.UK</a>
            <a href="https://www.moneyhelper.org.uk" target="_blank" rel="noopener">Free guidance from MoneyHelper</a>
          </div>
        </div>
      )}

      <h2 className="h2">This week</h2>
      <div>
        <CatRow name="Spending money" val={`${gbp(r.freeWeek)} of ${gbp(al)}`} pct={al ? Math.min(100, (r.freeWeek / al) * 100) : r.freeWeek ? 100 : 0} over={r.freeWeek > al + 0.01} main />
        {P.costs.map((c) => {
          const plan = weekly(c)
          const spent = r.spentWeek[c.cat] || 0
          return <CatRow key={c.name} name={c.name} val={spent ? `${gbp(spent)} of ${gbp(plan)}` : `${gbp(plan)} set aside`} pct={plan ? Math.min(100, (spent / plan) * 100) : 0} over={spent > plan + 0.01} />
        })}
      </div>

      <h2 className="h2">Recent</h2>
      {list.length ? (
        <ul className="entries">
          {list.map((e) => (
            <li className="entry" key={e.id}>
              <span>
                <span className="entry-title">{e.kind === 'income' ? 'Income' : e.cat}</span>
                <span className="entry-sub">{fmtDate(parseIso(e.date))}{e.note ? ', ' + e.note : ''}</span>
              </span>
              <span className={`entry-amt ${e.kind === 'income' ? 'in' : ''}`}>
                {e.kind === 'income' ? '+' : ''}{gbp(e.amount)}{e.kind === 'income' && e.freq && e.freq !== 'once' ? ` a ${e.freq}` : ''}
              </span>
              <button className="icon-btn small" aria-label="Delete this entry" onClick={() => { update((s) => { s.entries = s.entries.filter((x) => x.id !== e.id) }); toast('Entry deleted') }}>
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Nothing logged yet. Tell Runway when you spend, like “spent £12 on food”.</p>
      )}
    </>
  )
}

function DebtCard({ d }: { d: Debt }) {
  const { update, openDebt, setOpenDebt, toast } = useStore()
  const open = openDebt === d.id
  const t0 = today0()
  const unpaid = d.instalments.filter((i) => !i.paid)
  const nx = unpaid[0]
  const remaining = d.type === 'overdraft' ? d.principal : unpaid.reduce((a, i) => a + i.amount, 0)
  const late = !!nx && parseIso(nx.due) < t0
  const prog = d.instalments.length ? ((d.instalments.length - unpaid.length) / d.instalments.length) * 100 : 0
  const sub = d.type === 'overdraft' ? 'Overdraft balance' : nx ? `Next ${gbp(nx.amount)} on ${fmtDate(parseIso(nx.due))}${late ? ', overdue' : ''}` : 'Paid off'

  return (
    <div className="debt">
      <button className="debt-head" aria-expanded={open} onClick={() => setOpenDebt(open ? null : d.id)}>
        <span>
          <span className="debt-name">{d.provider}{d.label && <> <span className="muted" style={{ fontWeight: 400 }}>for {d.label.toLowerCase()}</span></>}</span>
          <span className={`debt-sub ${late ? 'late' : ''}`}>{sub}</span>
        </span>
        <span className="debt-amt">{gbp(remaining)}</span>
      </button>
      {d.instalments.length > 0 && <span className="bar" aria-hidden="true"><i style={{ width: `${prog}%` }} /></span>}
      {open && (
        <>
          {d.type === 'overdraft' ? (
            <>
              <div className="facts">
                <span>Balance</span><span>{gbp(d.principal)}</span>
                <span>Interest-free up to</span><span>{gbp(d.free)}</span>
                <span>Interest above that</span><span>{d.apr}% a year</span>
                <span>Interest this month, about</span><span>{gbp((Math.max(0, d.principal - d.free) * d.apr) / 100 / 12, true)}</span>
              </div>
              <p className="small muted">Interest-free limits often shrink after graduation. Check the date with your bank.</p>
            </>
          ) : (
            <>
              <ul className="sched">
                {d.instalments.map((i, k) => (
                  <li key={k}>
                    <span>{fmtDate(parseIso(i.due))}{!i.paid && parseIso(i.due) < t0 && <> <span className="debt-sub late" style={{ display: 'inline' }}>overdue</span></>}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{gbp(i.amount, true)}</span>
                    {i.paid ? <span className="done">Paid</span> : (
                      <button className="mini" onClick={() => { update((s) => { s.debts.find((x) => x.id === d.id)!.instalments[k].paid = true }); toast('Marked as paid') }}>Mark paid</button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="facts">
                <span>Borrowed</span><span>{gbp(d.principal, true)}</span>
                <span>Total you’ll pay</span><span>{gbp(d.total, true)}</span>
                <span>Interest and fees</span><span>{gbp(d.interest, true)}</span>
              </div>
            </>
          )}
          <button className="link" onClick={() => { update((s) => { s.debts = s.debts.filter((x) => x.id !== d.id) }); toast('Debt removed') }}>Remove this debt</button>
        </>
      )}
    </div>
  )
}

export function Debts() {
  const { S, update } = useStore()
  const owed = S.debts.reduce((a, d) => a + (d.type === 'overdraft' ? d.principal : d.instalments.filter((i) => !i.paid).reduce((x, i) => x + i.amount, 0)), 0)
  const up = S.debts
    .flatMap((d) => d.instalments.filter((i) => !i.paid).map((i) => ({ d, i })))
    .sort((a, b) => (a.i.due < b.i.due ? -1 : 1))[0]
  const L = S.studentLoan

  return (
    <>
      <section className="hero small">
        <p className="figure-label">You owe, not counting your student loan</p>
        <p className="figure">{gbp(owed)}</p>
        <p className="hero-line">{up ? `Next payment ${gbp(up.i.amount)} to ${up.d.provider} on ${fmtDate(parseIso(up.i.due))}` : 'No payments coming up'}</p>
      </section>

      {S.tipBnpl && !S.tipSeen && (
        <div className="banner">
          <p><strong>Worth knowing:</strong> BNPL providers such as Klarna can report missed payments to credit reference agencies, which can affect your credit file. Runway will remind you 3 days before each payment.</p>
          <button className="link" onClick={() => update((s) => { s.tipSeen = true })}>Got it</button>
        </div>
      )}

      <h2 className="h2">Short-term debts</h2>
      {S.debts.length ? S.debts.map((d) => <DebtCard key={d.id} d={d} />) : (
        <p className="empty">Nothing here yet. If you use Klarna, an overdraft or a loan, tell Runway and it’ll show you the real cost before you add it.</p>
      )}

      <h2 className="h2">Student loan</h2>
      <div className="sl">
        <div className="fr">
          <label className="lbl" htmlFor="sl-b">Borrowed so far, estimated</label>
          <div className="money-wrap"><span>£</span>
            <input id="sl-b" className="inp" inputMode="decimal" value={L.borrowed} onChange={(e) => update((s) => { s.studentLoan.borrowed = num(e.target.value) || 0 })} />
          </div>
        </div>
        <p className="small muted" style={{ marginTop: -6 }}>Check the exact figure in your Student Finance account.</p>
        <div className="fr">
          <label className="lbl" htmlFor="sl-s">If you later earn <strong style={{ color: 'var(--text)' }}>{gbp(L.salary)}</strong> a year</label>
          <input id="sl-s" type="range" min={20000} max={70000} step={1000} value={L.salary} onChange={(e) => update((s) => { s.studentLoan.salary = num(e.target.value) || 0 })} />
        </div>
        <p className="repay">You’d repay <strong>{gbp(studentLoanMonthly(L.salary), true)}</strong> a month</p>
        <p className="small muted">Assumes Plan 5, for courses starting from August 2023: 9% of income above £25,000, and anything left is written off after 40 years. What you repay depends on what you earn, not on how much you owe. <a href="https://www.gov.uk/repaying-your-student-loan" target="_blank" rel="noopener">How repayment works on GOV.UK</a></p>
      </div>
    </>
  )
}

export function Account() {
  const { S, update, setSheet, toast } = useStore()
  const navigate = useNavigate()
  const P = S.profile!
  const A = S.account

  function copy() {
    const txt = JSON.stringify({ profile: S.profile, entries: S.entries, debts: S.debts }, null, 2)
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => toast('Copied your data'), () => setSheet({ type: 'copy' }))
    else setSheet({ type: 'copy' })
  }

  return (
    <>
      <h1 className="h1">{A?.name ? `${firstName(A.name)}’s setup` : 'Your setup'}</h1>
      {A && (
        <>
          <div className="kv"><span>University</span><span>{A.uni}, {A.year}</span></div>
          <div className="kv"><span>Email</span><span>{A.email}</span></div>
        </>
      )}
      <div className="kv"><span>Available at the start of this period</span><span>{gbp(P.opening)}</span></div>
      <div className="kv"><span>Next loan payment</span><span>{gbp(P.nextAmount)} on {fmtDate(parseIso(P.nextDate))}</span></div>
      {P.costs.map((c) => <div className="kv" key={c.name}><span>{c.name}</span><span>{gbp(c.amount)} a {c.freq}</span></div>)}
      <div className="kv"><span>Plan</span><span>{S.partner ? `Free through ${S.partner}` : 'Free trial, then £7 a month'}</span></div>

      <div className="stack">
        <button className="btn btn-primary btn-block" onClick={() => setSheet(rolloverSheet(S))}>My loan payment arrived</button>
        <button className="btn btn-ghost btn-block" onClick={() => { update((s) => { s.step = 'onboard'; s.chat = []; s.draft = null }); navigate('/onboarding/setup') }}>Redo setup</button>
        <button className="btn btn-ghost btn-block" onClick={() => {
          // Leave the app first, so the signed-in guard doesn't redirect to sign-in.
          navigate('/')
          window.setTimeout(() => { update((s) => { s.session = false }); window.scrollTo(0, 0); toast('Signed out. Your budget is saved on this device.') })
        }}>Sign out</button>
      </div>

      <h2 className="h2">Reminders</h2>
      <label className="toggle">
        <input type="checkbox" checked={S.notify} onChange={(e) => { const on = e.target.checked; update((s) => { s.notify = on }); toast(on ? 'Reminders on' : 'Reminders off') }} />
        <span>Remind me 3 days before a debt payment is due</span>
      </label>

      <h2 className="h2">How Runway uses AI</h2>
      <p className="small muted">AI reads what you type or say and turns it into amounts and categories, which you always confirm. Every figure is worked out by Runway’s budget calculator, not the AI. Runway gives information, not financial advice, and you make every decision.</p>

      <h2 className="h2">Your data</h2>
      <div className="stack" style={{ marginTop: 8 }}>
        <button className="btn btn-ghost btn-block" onClick={copy}>Copy my data</button>
        <button className="btn btn-danger btn-block" onClick={() => setSheet({ type: 'delete' })}>Delete my data</button>
      </div>
    </>
  )
}
