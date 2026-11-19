import { useNavigate } from 'react-router-dom'
import mark from '../mark.png'
import { fmtDate, gbp } from '../lib/format'
import type { Result, Status } from '../lib/types'
import { useStore } from '../state/store'

export function Brand({ size = 28 }: { size?: number }) {
  const navigate = useNavigate()
  return (
    <button className="brand brand-btn" onClick={() => navigate('/')} aria-label="Runway website">
      <img src={mark} alt="" width={size} height={size} />
      <span>Runway</span>
    </button>
  )
}

export function Mark({ size }: { size: number }) {
  return <img src={mark} alt="" width={size} height={size} />
}

const STATUS_TEXT: Record<Status, string> = { ok: 'On track', tight: 'Tight', over: 'Runs short' }

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${status}`}>{STATUS_TEXT[status]}</span>
}

/** The runway strip: one light per week until the next loan lands. */
export function RunwayStrip({ r, nextAmount }: { r: Result; nextAmount: number }) {
  const n = Math.ceil(r.totalWeeks)
  const msg = r.status === 'over' ? `Runs out in week ${Math.floor(r.coveredWeeks) + 1}` : `Lasts until ${fmtDate(r.next)}`
  const cells = Array.from({ length: n }, (_, i) => {
    let cls = 'lit'
    if (i < r.weekIdx) cls = 'past'
    if (i === r.weekIdx) cls = 'now'
    if (i > r.weekIdx && r.status === 'over' && i >= Math.floor(r.coveredWeeks)) cls = 'gone'
    return <span key={i} className={`week ${cls}`} />
  })
  return (
    <div className="runway" role="img" aria-label={`Week ${r.weekIdx + 1} of ${n}. ${msg}.`}>
      <div className="strip-top" aria-hidden="true">
        <strong>Week {r.weekIdx + 1} of {n}</strong>
        <span>{msg}</span>
      </div>
      <div className="lights" aria-hidden="true">{cells}</div>
      <div className="strip-meta" aria-hidden="true">
        <span>{fmtDate(r.start)}</span>
        <span>Next loan {gbp(nextAmount)} on {fmtDate(r.next)}</span>
      </div>
    </div>
  )
}

/** Animated demo strip used on the website. */
export function DemoLights({ count = 12 }: { count?: number }) {
  return (
    <div className="lights" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`week ${i === 0 ? 'now' : 'lit'}`} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  )
}

export function Toast({ fixed = false }: { fixed?: boolean }) {
  const { toastMsg, toastOn } = useStore()
  return (
    <div className={`toast ${toastOn ? 'show' : ''} ${fixed ? 'fixed' : ''}`} role="status" aria-live="polite">
      {toastMsg}
    </div>
  )
}

export function CatRow({ name, val, pct, over, main }: { name: string; val: string; pct: number; over: boolean; main?: boolean }) {
  return (
    <div className={`cat ${main ? 'cat-main' : ''}`}>
      <span className="cat-name">{name}</span>
      <span className="cat-val">{val}</span>
      <span className="bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} className={over ? 'over' : ''} />
      </span>
    </div>
  )
}
