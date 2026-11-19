import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Brand, Mark, Toast } from './components/Bits'
import { Chips } from './components/Composer'
import { Sheet } from './components/Sheet'
import type { Step } from './lib/types'
import Landing from './pages/Landing'
import { Signin, Signup } from './pages/Auth'
import { Confirm, Consent, Setup } from './pages/Onboarding'
import { Account, AppLayout, Debts, Home } from './pages/AppPages'
import { StoreProvider, STEP_ROUTE, useStore, whereTo } from './state/store'

/** On desktop, the app sits in a phone-sized frame with an explainer beside it. */
function Frame() {
  return (
    <div className="shell">
      <aside className="about" aria-label="About Runway">
        <div className="about-brand"><Mark size={44} /><span>Runway</span></div>
        <h1>Start-ups run out of cash. Students do too.</h1>
        <p>Runway turns a lump-sum student loan into a weekly number, lets students check a purchase before they make it, and keeps BNPL, overdrafts and the student loan in one view.</p>
        <h2>What it does</h2>
        <dl>
          <div><dt>A weekly figure you can trust</dt><dd>Sets aside rent and regular costs, then spreads what’s left across the weeks until the next loan payment lands.</dd></div>
          <div><dt>Ask before you spend</dt><dd>Shows what a purchase does to this week and next, then hands the decision back. No lectures, no verdicts.</dd></div>
          <div><dt>Every debt in one place</dt><dd>Shows the real cost of Klarna, an overdraft or a loan before it’s added, and what the student loan means after graduation.</dd></div>
        </dl>
        <h2>Try it</h2>
        <p>Finish setup in the app, then tap one of these or type your own.</p>
        <div className="try"><Chips /></div>
        <p className="fine">Prototype. Your details stay in this browser. Runway gives information, not financial advice.</p>
      </aside>
      <div className="app">
        <div id="view">
          <Outlet />
        </div>
        <Sheet />
        <Toast />
      </div>
    </div>
  )
}

/* ---------- guards: each route checks where the person is in the journey ---------- */

/** Sign-up and sign-in are only for people who aren't signed in. */
function SignedOut({ children }: { children: ReactNode }) {
  const { S } = useStore()
  return S.session ? <Navigate to={whereTo(S)} replace /> : <>{children}</>
}

const ORDER: Step[] = ['signup', 'consent', 'onboard', 'confirm', 'app']

/** Onboarding pages: you can go back to an earlier step, but not skip ahead. */
function AtStep({ step, children }: { step: Step; children: ReactNode }) {
  const { S } = useStore()
  if (!S.session || S.step === 'app') return <Navigate to={whereTo(S)} replace />
  if (ORDER.indexOf(step) > ORDER.indexOf(S.step)) return <Navigate to={STEP_ROUTE[S.step]} replace />
  if (step === 'confirm' && !S.draft) return <Navigate to={STEP_ROUTE.onboard} replace />
  return <>{children}</>
}

/** Home, Debts and You need a finished setup. */
function InApp() {
  const { S } = useStore()
  if (!S.session || S.step !== 'app' || !S.profile) return <Navigate to={whereTo(S)} replace />
  return <AppLayout />
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="col">
      <div className="top"><Brand /></div>
      <div className="pad">
        <h1 className="h1">This page doesn’t exist</h1>
        <p className="lead">The link may be old or mistyped.</p>
        <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>Go to the Runway website</button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<Landing />} />
          <Route path="/features" element={<Landing />} />
          <Route path="/universities" element={<Landing />} />
          <Route path="/pricing" element={<Landing />} />
          <Route path="/questions" element={<Landing />} />
          <Route element={<Frame />}>
            <Route path="/signup" element={<SignedOut><Signup /></SignedOut>} />
            <Route path="/signin" element={<SignedOut><Signin /></SignedOut>} />
            <Route path="/onboarding/consent" element={<AtStep step="consent"><Consent /></AtStep>} />
            <Route path="/onboarding/setup" element={<AtStep step="onboard"><Setup /></AtStep>} />
            <Route path="/onboarding/confirm" element={<AtStep step="confirm"><Confirm /></AtStep>} />
            <Route element={<InApp />}>
              <Route path="/home" element={<Home />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/account" element={<Account />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
