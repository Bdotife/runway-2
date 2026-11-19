# Runway

Runway turns a student loan into one number to spend each week, lets students check a purchase before they make it, and keeps every debt in one place.

Built with **React 19**, **TypeScript** and **Vite**, with **React Router** for pages.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server with hot reload |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run preview` | Serves the built `dist/` folder |

## Pages

| Route | Page |
| --- | --- |
| `/` | Marketing website |
| `/signup`, `/signin` | Accounts |
| `/onboarding/consent` | AI and data consent |
| `/onboarding/setup` | Setup chat |
| `/onboarding/confirm` | Check what Runway understood |
| `/home` | Weekly figure, this week's spending, recent entries |
| `/debts` | BNPL, overdrafts, loans and the student loan |
| `/account` | Setup, reminders, copy or delete data |

Each route checks where the person is in the journey. Opening `/home` while signed out goes to sign-up or sign-in, and you can't skip ahead in onboarding.

## Code layout

```
src/
  lib/
    types.ts       Shared types (State, Profile, Entry, Debt…)
    engine.ts      Budget engine: every number Runway shows comes from here
    parse.ts       Language parsing: turns typed text into amounts, dates, intents
    format.ts      Dates, money formatting, small helpers
    constants.ts   Example text, partner codes, universities
  state/
    store.tsx      App state (React context), saved to localStorage
  components/      Shared UI: composer with voice input, bottom sheets, fields, icons
  pages/           Landing, Auth, Onboarding, AppPages (Home, Debts, Account)
  App.tsx          Routes and route guards
  styles.css       All styles, with light and dark themes
```

## Deploy

On Vercel or Netlify, import the repository. The framework is detected as Vite, the build command is `npm run build`, and the output folder is `dist`. Single-page routing works out of the box on Vercel (`vercel.json` rewrites every path to `index.html`).

## Prototype limits

- Accounts and budgets live in the browser (localStorage). Passwords are stored only as a SHA-256 hash. There is no server yet.
- Language understanding is rule-based (`src/lib/parse.ts`) and stands in for the LLM layer.
- Voice input needs HTTPS and a browser with speech recognition (Chrome, Edge, Safari).
