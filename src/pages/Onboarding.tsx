import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Bits'
import { Composer } from '../components/Composer'
import { XIcon } from '../components/Icons'
import { LALA } from '../lib/constants'
import { compute } from '../lib/engine'
import { cap, iso, num, parseIso, today0 } from '../lib/format'
import { catOf, parseSetup } from '../lib/parse'
import type { DraftCost, Freq } from '../lib/types'
import { STEP_ROUTE, useStore } from '../state/store'

export function Consent() {
  const { S, update } = useStore()
  const navigate = useNavigate()
  const c = S.consent
  return (
    <div className="col">
      <div className="top"><Brand /><span className="top-note">Step 2 of 4</span></div>
      <div className="pad">
        <button className="back" onClick={() => navigate('/')}>‹ Back to site</button>
        <h1 className="h1">Before we start</h1>
        <p className="lead">Runway uses AI to understand what you type or say. It shows you information about your money so you can decide. It doesn’t give financial advice, and it never decides for you.</p>
        <label className="check">
          <input type="checkbox" checked={c.ai} onChange={(e) => update((s) => { s.consent.ai = e.target.checked })} />
          <span>I understand Runway uses AI and gives information, not financial advice.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={c.data} onChange={(e) => update((s) => { s.consent.data = e.target.checked })} />
          <span>I agree to Runway storing my budget details to work out my weekly figure. I can delete them any time.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={!(c.ai && c.data)} onClick={() => {
          update((s) => { s.step = 'onboard' })
          navigate(STEP_ROUTE.onboard)
        }}>Continue</button>
      </div>
    </div>
  )
}

const INTRO = 'Tell me what you’ve got right now, when your next loan payment lands, and your regular costs like rent and food. Write it the way you’d text a friend.'

export function Setup() {
  const { S, update, replace } = useStore()
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [S.chat.length])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function submit(q: string) {
    let done = false
    const s = structuredClone(S)
    {
      s.chat.push({ who: 'me', text: q })
      // Re-read everything they've said so far, so later messages can fill gaps.
      const all = s.chat.filter((m) => m.who === 'me').map((m) => m.text).join(' ')
      const p = parseSetup(all)
      const prev = s.draft || { balance: null, nextAmount: null, nextDate: null, costs: [] }
      const costs = prev.costs.slice()
      for (const c of p.costs) if (!costs.some((x) => x.cat === c.cat)) costs.push(c)
      s.draft = { balance: p.balance ?? prev.balance, nextAmount: p.nextAmount ?? prev.nextAmount, nextDate: p.nextDate ?? prev.nextDate, costs }
      const d = s.draft
      if (d.balance == null) s.chat.push({ who: 'bot', text: 'How much do you have available right now?' })
      else if (d.nextAmount == null || d.nextDate == null)
        s.chat.push({ who: 'bot', text: 'When does your next loan payment land, and how much will it be? For example “£3,200 on 8 January”.' })
      else {
        s.chat.push({ who: 'bot', text: 'Got it. Check I’ve understood you properly.' })
        done = true
      }
    }
    replace(s)
    if (done) {
      timer.current = window.setTimeout(() => {
        update((s) => { s.step = 'confirm' })
        navigate(STEP_ROUTE.confirm)
      }, 700)
    }
  }

  return (
    <div className="col">
      <div className="top"><Brand /><span className="top-note">Step 3 of 4</span></div>
      <div className="main chat" ref={scroller}>
        {[{ who: 'bot', text: INTRO }, ...S.chat].map((m, i) => (
          <div key={i} className={`msg ${m.who}`}>{m.text}</div>
        ))}
        {S.chat.length === 0 && (
          <button className="example" onClick={() => submit(LALA)}>
            <strong>Use Lala’s example</strong>“{LALA}”
          </button>
        )}
      </div>
      <Composer mode="onboard" onSubmit={submit} />
    </div>
  )
}

export function Confirm() {
  const { S, update, toast } = useStore()
  const navigate = useNavigate()
  const d = S.draft!

  const setD = (k: 'balance' | 'nextAmount' | 'nextDate', v: string) => update((s) => { s.draft![k] = v })
  const setCost = (i: number, k: keyof DraftCost, v: string) => update((s) => { (s.draft!.costs[i] as unknown as Record<string, string>)[k] = v })

  function confirm() {
    const bal = num(d.balance)
    const na = num(d.nextAmount)
    if (!(bal >= 0)) return toast('Add how much you have available now.')
    if (!(na > 0)) return toast('Add your next loan payment amount.')
    if (!d.nextDate || parseIso(d.nextDate) <= today0()) return toast('Pick a payment date after today.')
    const costs = d.costs
      .filter((c) => num(c.amount) > 0 && String(c.name).trim())
      .map((c) => {
        const name = cap(String(c.name).trim())
        const k = catOf(name)
        return { name, cat: k === 'Other' ? name : k, amount: num(c.amount), freq: c.freq }
      })
    update((s) => {
      s.profile = { opening: bal, nextAmount: na, nextDate: d.nextDate!, periodStart: iso(today0()), costs }
      s.step = 'app'
      s.baseline = compute(s).allowance
    })
    navigate('/home')
    toast('Your weekly figure is ready')
  }

  return (
    <div className="col">
      <div className="top"><Brand /><span className="top-note">Step 4 of 4</span></div>
      <div className="main">
        <button className="back" onClick={() => { update((s) => { s.step = 'onboard' }); navigate(STEP_ROUTE.onboard) }}>‹ Back to chat</button>
        <h1 className="h1">Is this right?</h1>
        <p className="lead">Nothing is saved until you confirm. Fix anything I got wrong.</p>
        <div className="fr">
          <label className="lbl" htmlFor="d-balance">Available now</label>
          <div className="money-wrap"><span>£</span><input id="d-balance" className="inp" inputMode="decimal" value={d.balance ?? ''} onChange={(e) => setD('balance', e.target.value)} /></div>
        </div>
        <div className="two">
          <div className="fr">
            <label className="lbl" htmlFor="d-next">Next loan payment</label>
            <div className="money-wrap"><span>£</span><input id="d-next" className="inp" inputMode="decimal" value={d.nextAmount ?? ''} onChange={(e) => setD('nextAmount', e.target.value)} /></div>
          </div>
          <div className="fr">
            <label className="lbl" htmlFor="d-date">Lands on</label>
            <input id="d-date" type="date" className="inp" value={d.nextDate || ''} onChange={(e) => setD('nextDate', e.target.value)} />
          </div>
        </div>
        <h2 className="h2">Regular costs</h2>
        {d.costs.length === 0 && <p className="empty">No regular costs yet. Add rent, food or anything you pay every week or month.</p>}
        {d.costs.map((c, i) => (
          <div className="cost-row" key={i}>
            <input className="inp" aria-label="Cost name" placeholder="Name" value={c.name} onChange={(e) => setCost(i, 'name', e.target.value)} autoFocus={!c.name && i === d.costs.length - 1} />
            <div className="money-wrap"><span>£</span><input className="inp" inputMode="decimal" aria-label={`${c.name || 'Cost'} amount`} value={c.amount} onChange={(e) => setCost(i, 'amount', e.target.value)} /></div>
            <select className="inp" aria-label="How often" value={c.freq} onChange={(e) => setCost(i, 'freq', e.target.value as Freq)}>
              {(['week', 'month', 'term'] as Freq[]).map((f) => <option key={f} value={f}>a {f}</option>)}
            </select>
            <button className="icon-btn small" aria-label={`Remove ${c.name || 'cost'}`} onClick={() => update((s) => { s.draft!.costs.splice(i, 1) })}><XIcon /></button>
          </div>
        ))}
        <button className="link" onClick={() => update((s) => { s.draft!.costs.push({ name: '', cat: '', amount: '', freq: 'month' }) })}>Add a cost</button>
      </div>
      <div className="footer-bar"><button className="btn btn-primary btn-block" onClick={confirm}>Looks right</button></div>
    </div>
  )
}
