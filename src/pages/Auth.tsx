import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Bits'
import { partnerFor, UNI_PARTNERS, UNIS, YEARS } from '../lib/constants'
import { hashPw } from '../lib/engine'
import { firstName } from '../lib/format'
import type { Account } from '../lib/types'
import { fresh, STEP_ROUTE, useStore } from '../state/store'

type Errs = Partial<Record<'name' | 'uni' | 'email' | 'password' | 'invite', string>>

function focus(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

function PasswordInput({ id, value, onChange, auto, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; auto: string; invalid: boolean; describedBy: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw-wrap">
      <input id={id} className="inp" type={show ? 'text' : 'password'} value={value} autoComplete={auto} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={describedBy} />
      <button type="button" className="pw-toggle" onClick={() => { setShow(!show); focus(id) }} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p className="err" id={id}>{msg}</p> : null
}

export function Signup() {
  const { S, update, replace, toast } = useStore()
  const navigate = useNavigate()
  const a: Account = { name: '', uni: '', email: '', year: '1st year', ...(S.account || {}) }
  const [pw, setPw] = useState('')
  const [errs, setErrs] = useState<Errs>({})

  // Details (but never the password) are saved as the person types, so a refresh keeps them.
  const setA = (k: keyof Account, v: string) => {
    update((s) => { s.account = { ...a, ...(s.account || {}), [k]: v } })
    if (errs[k as keyof Errs]) setErrs({ ...errs, [k]: undefined })
  }

  async function submit() {
    const e: Errs = {}
    if (!a.name.trim()) e.name = 'Enter your name.'
    if (!a.uni.trim()) e.uni = 'Enter your university.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim())) e.email = 'Enter an email address like you@university.ac.uk.'
    if (pw.length < 8 || !/\d/.test(pw)) e.password = 'Use at least 8 characters, including a number.'
    if (a.invite && a.invite.trim() && !partnerFor(a.invite)) e.invite = 'That code isn’t recognised. Check it with your bank or university, or leave it blank.'
    setErrs(e)
    const first = Object.keys(e)[0]
    if (first) return focus('acc-' + first)

    const account: Account = { ...a, name: a.name.trim(), email: a.email.trim(), uni: a.uni.trim(), pw: await hashPw(pw) }
    const partner = partnerFor(a.invite) || S.partner || UNI_PARTNERS[account.uni] || null
    replace({ ...fresh(), account, partner, session: true, step: 'consent' })
    navigate(STEP_ROUTE.consent)
    toast(`Account created. Welcome, ${firstName(account.name)}`)
  }

  const uniHint = UNI_PARTNERS[a.uni]
    ? <p className="hint good" id="uni-hint">{UNI_PARTNERS[a.uni]} gives its students Runway for free.</p>
    : <p className="hint" id="uni-hint">Pick from the list or type it in full.</p>
  const emailHint = /\.ac\.uk$/i.test(a.email.trim())
    ? <p className="hint good" id="email-hint">University email recognised.</p>
    : <p className="hint" id="email-hint">Your university email works best, but any email is fine.</p>

  return (
    <div className="col">
      <div className="top"><Brand /><span className="top-note">Step 1 of 4</span></div>
      <form className="pad" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
        <button type="button" className="back" onClick={() => navigate('/')}>‹ Back to site</button>
        <h1 className="h1">Create your account</h1>
        <p className="lead">Tell us where you study. Some universities and banks give their students Runway for free.</p>

        <div className="fr">
          <label className="lbl" htmlFor="acc-name">Full name</label>
          <input id="acc-name" className="inp" autoComplete="name" value={a.name} onChange={(e) => setA('name', e.target.value)} aria-invalid={!!errs.name || undefined} aria-describedby={errs.name ? 'acc-name-err' : undefined} autoFocus />
          <Err id="acc-name-err" msg={errs.name} />
        </div>

        <div className="fr">
          <label className="lbl" htmlFor="acc-uni">University</label>
          <input id="acc-uni" className="inp" list="unis" autoComplete="organization" placeholder="Start typing your university" value={a.uni} onChange={(e) => setA('uni', e.target.value)} aria-invalid={!!errs.uni || undefined} aria-describedby={errs.uni ? 'acc-uni-err' : 'uni-hint'} />
          <datalist id="unis">{UNIS.map((u) => <option key={u} value={u} />)}</datalist>
          {errs.uni ? <Err id="acc-uni-err" msg={errs.uni} /> : uniHint}
        </div>

        <div className="fr">
          <label className="lbl" htmlFor="acc-year">Year of study</label>
          <select id="acc-year" className="inp" value={a.year} onChange={(e) => setA('year', e.target.value)}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>

        <div className="fr">
          <label className="lbl" htmlFor="acc-email">Email</label>
          <input id="acc-email" className="inp" type="email" inputMode="email" autoComplete="email" placeholder="you@university.ac.uk" value={a.email} onChange={(e) => setA('email', e.target.value)} aria-invalid={!!errs.email || undefined} aria-describedby={errs.email ? 'acc-email-err' : 'email-hint'} />
          {errs.email ? <Err id="acc-email-err" msg={errs.email} /> : emailHint}
        </div>

        <div className="fr">
          <label className="lbl" htmlFor="acc-password">Password</label>
          <PasswordInput id="acc-password" value={pw} auto="new-password" onChange={(v) => { setPw(v); if (errs.password) setErrs({ ...errs, password: undefined }) }} invalid={!!errs.password} describedBy={errs.password ? 'acc-password-err' : 'pw-hint'} />
          {errs.password ? <Err id="acc-password-err" msg={errs.password} /> : <p className="hint" id="pw-hint">At least 8 characters, including a number.</p>}
        </div>

        <div className="fr">
          <label className="lbl" htmlFor="acc-invite">Invite code, if you have one</label>
          <input id="acc-invite" className="inp" autoComplete="off" placeholder="For example NATWEST" value={a.invite || ''} onChange={(e) => setA('invite', e.target.value)} aria-invalid={!!errs.invite || undefined} aria-describedby={errs.invite ? 'acc-invite-err' : undefined} />
          <Err id="acc-invite-err" msg={errs.invite} />
        </div>

        {S.account?.pw && !S.session && (
          <p className="forgot">There’s already a Runway account on this device. Creating a new one replaces it. <button type="button" className="link inline" onClick={() => navigate('/signin')}>Sign in instead</button></p>
        )}
        <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>Create account</button>
        <p className="signup-note">Already have an account? <button type="button" className="link inline" onClick={() => navigate('/signin')}>Sign in</button></p>
        <p className="signup-note">We’ll send a link to confirm your email. We never sell your data.</p>
      </form>
    </div>
  )
}

export function Signin() {
  const { S, update, toast } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState(S.account?.email || '')
  const [pw, setPw] = useState('')
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})
  const [forgot, setForgot] = useState(false)

  async function submit() {
    const em = email.trim().toLowerCase()
    const e: typeof errs = {}
    if (!em) e.email = 'Enter your email.'
    if (!pw) e.password = 'Enter your password.'
    if (!e.email && (!S.account?.pw || S.account.email.trim().toLowerCase() !== em)) e.email = 'There’s no Runway account with this email on this device.'
    if (Object.keys(e).length) {
      setErrs(e)
      return focus(e.email ? 'si-email' : 'si-password')
    }
    if ((await hashPw(pw)) !== S.account!.pw) {
      setErrs({ password: 'That password isn’t right. Try again.' })
      return focus('si-password')
    }
    const step = S.step === 'signup' ? 'consent' : S.step
    update((s) => { s.session = true; s.step = step })
    navigate(STEP_ROUTE[step])
    toast(`Welcome back, ${firstName(S.account!.name)}`)
  }

  return (
    <div className="col">
      <div className="top"><Brand /><span className="top-note">Sign in</span></div>
      <form className="pad" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
        <button type="button" className="back" onClick={() => navigate('/')}>‹ Back to site</button>
        <h1 className="h1">Welcome back</h1>
        <p className="lead">Sign in to see this week’s number.</p>
        <div className="fr">
          <label className="lbl" htmlFor="si-email">Email</label>
          <input id="si-email" className="inp" type="email" inputMode="email" autoComplete="email" value={email} autoFocus={!email}
            onChange={(e) => { setEmail(e.target.value); setErrs({ ...errs, email: undefined }) }}
            aria-invalid={!!errs.email || undefined} aria-describedby={errs.email ? 'si-email-err' : undefined} />
          <Err id="si-email-err" msg={errs.email} />
        </div>
        <div className="fr">
          <label className="lbl" htmlFor="si-password">Password</label>
          <PasswordInput id="si-password" value={pw} auto="current-password" onChange={(v) => { setPw(v); setErrs({ ...errs, password: undefined }) }} invalid={!!errs.password} describedBy={errs.password ? 'si-password-err' : ''} />
          <Err id="si-password-err" msg={errs.password} />
        </div>
        <button className="btn btn-primary btn-block">Sign in</button>
        <p className="signup-note"><button type="button" className="link inline" aria-expanded={forgot} onClick={() => setForgot(!forgot)}>Forgot your password?</button></p>
        {forgot && (
          <p className="forgot">This prototype keeps your account in this browser, so it can’t email you a reset link yet. To start again, <button type="button" className="link inline" onClick={() => navigate('/signup')}>create a new account</button>. It replaces the one on this device.</p>
        )}
        <p className="signup-note">New to Runway? <button type="button" className="link inline" onClick={() => navigate('/signup')}>Create an account</button></p>
      </form>
    </div>
  )
}
