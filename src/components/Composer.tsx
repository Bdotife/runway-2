import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHIPS } from '../lib/constants'
import { amounts, debtGuess, freqAfter, guessCat, intent } from '../lib/parse'
import { useStore } from '../state/store'
import { MicIcon, SendIcon } from './Icons'

/** Reads what the person typed and opens the matching sheet. */
export function useAsk() {
  const { S, setSheet, toast } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (q: string) => {
    if (S.step !== 'app' || !S.session) {
      toast('Finish setup first, then try this.')
      return
    }
    if (pathname === '/account') navigate('/home')
    const i = intent(q)
    const am = amounts(q)
    const amt = am.length ? am[0].v : ''
    if (i === 'afford') setSheet({ type: 'afford', raw: q, d: { amount: amt, cat: guessCat(q, 'Going out') } })
    else if (i === 'spend') setSheet({ type: 'entry', raw: q, d: { kind: 'spend', amount: amt, cat: guessCat(q, 'Other'), freq: 'once', note: q } })
    else if (i === 'income') {
      const f = am.length ? freqAfter(q, am[0].end) : null
      setSheet({ type: 'entry', raw: q, d: { kind: 'income', amount: amt, cat: 'Income', freq: f && f !== 'term' ? f : 'once', note: q } })
    } else if (i === 'debt') setSheet({ type: 'debt', raw: q, d: debtGuess(q, amt) })
    else setSheet({ type: 'resource', raw: q })
  }
}

export function Chips() {
  const ask = useAsk()
  return (
    <>
      {CHIPS.map((c) => (
        <button key={c} type="button" className="chip" onClick={() => ask(c)}>{c}</button>
      ))}
    </>
  )
}

/** Text box with voice input. `mode="app"` adds the suggestion chips. */
export function Composer({ mode, onSubmit }: { mode: 'app' | 'onboard'; onSubmit: (q: string) => void }) {
  const { toast } = useStore()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const rec = useRef<SpeechRecognitionLike | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => () => rec.current?.stop(), [])

  function mic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      toast('Voice isn’t available in this browser. Type instead.')
      return
    }
    if (listening) {
      try { rec.current?.stop() } catch { /* already stopped */ }
      return
    }
    try {
      const r = new SR()
      r.lang = 'en-GB'
      r.interimResults = true
      r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
      r.onerror = (e) =>
        toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone access is blocked here. Type instead.' : 'Didn’t catch that. Try again or type it.')
      r.onend = () => {
        setListening(false)
        input.current?.focus()
      }
      rec.current = r
      setListening(true)
      r.start()
    } catch {
      setListening(false)
      toast('Voice isn’t available here. Type instead.')
    }
  }

  return (
    <form
      className="composer"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault()
        const q = text.trim()
        if (!q) return
        setText('')
        onSubmit(q)
      }}
    >
      {mode === 'app' && (
        <div className="chips">
          <Chips />
        </div>
      )}
      <div className="row">
        <button type="button" className={`icon-btn ${listening ? 'rec' : ''}`} onClick={mic} aria-label={listening ? 'Stop listening' : 'Speak to Runway'}>
          <MicIcon />
        </button>
        <label className="sr" htmlFor="ask">Message Runway</label>
        <input
          id="ask"
          ref={input}
          className="ask"
          placeholder={mode === 'app' ? 'Log a spend or ask before you buy' : 'Type here or tap the mic'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus={mode === 'onboard'}
        />
        <button className="icon-btn send" aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </form>
  )
}
