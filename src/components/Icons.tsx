import type { ReactNode } from 'react'

const svg = (size: number, sw: number, children: ReactNode) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const HomeIcon = () => svg(22, 1.9, <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />)
export const DebtsIcon = () =>
  svg(22, 1.9, <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 10h18M7 15h4" />
  </>)
export const MeIcon = () =>
  svg(22, 1.9, <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.6-4 4.6-6 8-6s6.4 2 8 6" />
  </>)
export const MicIcon = () =>
  svg(21, 1.9, <>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </>)
export const SendIcon = () => svg(21, 2.2, <path d="M5 12h14M13 6l6 6-6 6" />)
export const XIcon = () => svg(18, 2, <path d="M6 6l12 12M18 6 6 18" />)
