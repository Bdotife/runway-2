import type { Num } from '../lib/types'

type Opt = string | [string, string]

interface Base {
  id: string
  label: React.ReactNode
}

export function MoneyField({ id, label, value, onChange }: Base & { value: Num | null | undefined; onChange: (v: string) => void }) {
  return (
    <div className="fr">
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className="money-wrap">
        <span>£</span>
        <input id={id} className="inp" inputMode="decimal" value={value ?? ''} placeholder="0" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}

export function SelectField({ id, label, value, options, onChange }: Base & { value: string; options: Opt[]; onChange: (v: string) => void }) {
  return (
    <div className="fr">
      <label className="lbl" htmlFor={id}>{label}</label>
      <select id={id} className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o]
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </div>
  )
}

export function DateField({ id, label, value, onChange }: Base & { value: string; onChange: (v: string) => void }) {
  return (
    <div className="fr">
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} type="date" className="inp" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function TextField({ id, label, value, numeric, onChange }: Base & { value: Num; numeric?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="fr">
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} className="inp" inputMode={numeric ? 'decimal' : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
