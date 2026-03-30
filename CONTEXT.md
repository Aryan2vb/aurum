# Project Context — Aurum Dashboard

High-level guide to app structure, data flow, and how auth/routing/UI pieces fit together.
Use this as a quick-start map for any tooling or AI assistance.

---

## Tech Stack

| Layer              | Technology                                  |
| ------------------ | ------------------------------------------- |
| Framework          | React 18 (CRA, `react-scripts`)             |
| Routing            | `react-router-dom` v6                       |
| Tables             | `@tanstack/react-table` v8, `ag-grid-react` |
| Virtualisation     | `@tanstack/react-virtual`                   |
| UI components      | Radix UI (Dialog, Dropdown, etc.)           |
| Icons              | `react-icons`                               |
| Styling            | Vanilla CSS + CSS custom properties         |
| Spreadsheet export | `xlsx`                                      |
| Dev port           | `4001` (via `cross-env PORT=4001`)          |

---

## Project Structure

```
src/
│
├── App.js                # Root router
├── index.css             # Global styles + all theme tokens (light/dark per data-theme)
├── styles/
│   └── designTokens.css  # Spacing, typography, shadows, radius variables
│
├── config/
│   └── api.js            # API_BASE_URL (REACT_APP_API_BASE_URL or localhost:3000)
│
├── contexts/
│   └── ThemeContext.js   # Theme provider + toggleTheme / isDark hook
│
├── services/
│   ├── authService.js    # login, logout, whoami, parseResponse, clearSession
│   ├── customersService.js
│   └── creditsService.js
│
├── components/
│   ├── atoms/            # Button, Input, Icon, Text, Badge, SlideOver, Toast, …
│   ├── molecules/        # Tab, Pagination, SearchBar, CreditSummaryCard, CreditListRow, …
│   ├── organisms/        # Sidebar, DashboardHeader, CustomerTable, CustomerInspectorPanel, …
│   └── templates/
│       ├── AuthTemplate/       # Centered card layout for login/signup
│       └── DashboardTemplate/  # Sidebar + header + scrollable main content
│
└── pages/
    ├── LoginPage / SignupPage
    ├── DashboardPage
    ├── CustomersPage
    ├── CustomerProfilePage
    ├── CreditsListPage
    ├── CreditDetailPage
    ├── CreateCreditPage / EditCreditPage
    ├── RecordPaymentPage / EditPaymentPage
    ├── RemindersPage
    └── SettingsPage
```

---

## App Shell & Routing

- **Entry:** `src/index.js` → `<App />` (inside `React.StrictMode` — double-runs effects in _dev_ only).
- **Router:** `src/App.js` wires:
  - Public: `/login`, `/signup` — via `PublicRoute` (redirects to `/dashboard` if token present).
  - Protected: all other routes — via `ProtectedRoute` (redirects to `/login` if no token or 401).
  - Default: `/` → `/dashboard`.
- **Layout:** Every protected page wraps content in `DashboardTemplate`.

---

## Auth Flow

- **Service:** `src/services/authService.js`
  - `login({ email, password })` → POST `/auth/login`
  - `logout(token)` → POST `/auth/logout`
  - `whoami()` → GET `/auth/whoami`; stores `organizationName` in `localStorage`
  - `parseResponse(response)` — shared handler; on 401/403 calls `clearSession()` → throws `{ status, payload }`
  - `clearSession()` — removes `authToken`, `refreshToken`, `userEmail`, `organizationName`
  - `buildApiUrl(path)` from `src/config/api.js` prefixes `API_BASE_URL`
- **Token storage:** `localStorage` keys: `authToken`, `refreshToken`, `userEmail`, `organizationName`

---

## DashboardTemplate (Layout)

```
DashboardTemplate
 ├── <Sidebar>                - Fixed 180px, collapsible to 60px
 │     - Nav: Dashboard | Customers | Udhar | Reminders
 │     - Mobile: slides in from left (position:fixed, z-index:1600) via .open class
 ├── .mobile-menu-button      - Hamburger, visible at ≤768px, z-index:2000
 ├── .mobile-overlay          - Semi-transparent backdrop, z-index:1500
 └── .dashboard-main          - Flex-1, scrollable, padding-top:72px on mobile
       └── <DashboardHeader>  - Title + action buttons + tab bar
             └── {children}   - Page content
```

### Mobile sidebar toggle logic (Sidebar.js)

- Desktop: `collapsed` (boolean from localStorage) drives collapsed/expanded state.
- Mobile: `mobileOpen` prop is `true` → renders full sidebar regardless of `collapsed`.
- The `collapsed && !mobileOpen` guard ensures the sidebar always shows when explicitly opened on mobile.

---

## Design System

### Themes

- Defined by `data-theme` attribute on `<html>` — toggled by `ThemeContext`.
- Light variants: `light` (Warm Sage, default), `light-ocean`, `light-violet`, `light-coral`, `light-teal`, `light-amber`, `light-rose`, `light-indigo`.
- Dark: `dark`.
- All themes share the same CSS variable names (`--bg-primary`, `--accent`, `--sidebar-bg`, etc.) — only the values differ.

### Key Design Tokens (`designTokens.css`)

| Token group | Variables                                                        |
| ----------- | ---------------------------------------------------------------- |
| Typography  | `--font-family-sans` (Inter), `--font-size-*`, `--font-weight-*` |
| Spacing     | `--spacing-xs/sm/md/lg/xl/2xl/3xl` (4px → 64px)                  |
| Radius      | `--radius-sm/md/lg/full`                                         |
| Shadows     | `--shadow-sm/md/lg`                                              |
| Transitions | `--transition-fast/base/slow` (120–200ms ease)                   |
| Status      | `--color-status-active/overdue/paid/cancelled`                   |
| Risk        | `--color-risk-low/medium/high/very-high`                         |

### Atomic Design Structure

- **Atoms** — Button, Input, Icon, Text, Badge, Checkbox, SlideOver, Toast
- **Molecules** — Tab, Pagination, SearchBar, CreditSummaryCard, CreditListRow, EnumFilter, RangeFilter, DateRangeFilter, ImportExportMenu, ViewSelector, …
- **Organisms** — Sidebar, DashboardHeader, CustomerTable, CustomerInspectorPanel, RecordPaymentPanel, CreditEditPanel, AnalyticsChart, VisitHeatmap, …
- **Templates** — AuthTemplate, DashboardTemplate

---

## Mobile Responsiveness

**Breakpoints used across the codebase:**

| Breakpoint | Usage                                                              |
| ---------- | ------------------------------------------------------------------ |
| `≤ 1400px` | Hide secondary table columns (Credits list)                        |
| `≤ 1200px` | Collapse widget grids to single column                             |
| `≤ 1024px` | SlideOver becomes full-width; grid card min-width drops            |
| `≤ 768px`  | Mobile layout kicks in (hamburger, sidebar slide, content padding) |
| `≤ 640px`  | Form grids collapse, filter rows stack vertically                  |
| `≤ 480px`  | Toast, chips, and small components resize further                  |

**Key mobile rules (768px and below):**

- `DashboardTemplate`: sidebar removed from flow, hamburger shown, `dashboard-main` gets `padding-top: 72px`.
- `Sidebar`: `position: fixed; transform: translateX(-100%)` by default; adds `.open` class via `mobileOpen` prop for smooth `transition: transform 0.3s ease` slide-in.
- `DashboardHeader`: header actions row scrolls horizontally (hidden scrollbar); tabs row stays in a single line with horizontal scroll.
- `CustomerTable (.attio-header)`: toolbar stacks vertically; filter chips scroll horizontally; table itself gets `min-width: 800px` inside an `overflow-x: auto` wrapper.
- `CreditsListPage`: header stacks (title + toggle group on top, New Udhar button below); filter row stacks with full-width search.

---

## Quick Reference — API Calls

```js
import { buildApiUrl } from "../config/api";
import { parseResponse } from "../services/authService";

const token = localStorage.getItem("authToken");
const res = await fetch(buildApiUrl("/your-endpoint"), {
  method: "GET", // POST / PATCH / DELETE
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload), // when needed
});
const data = await parseResponse(res);
```

---

## Environment

| Variable                 | Default                 | Notes                                 |
| ------------------------ | ----------------------- | ------------------------------------- |
| `REACT_APP_API_BASE_URL` | `http://localhost:3000` | Set in `.env` or override in `api.js` |
| `PORT`                   | `4001`                  | Set via `cross-env` in `npm start`    |

> **Local network testing:** Change `DEFAULT_BASE_URL` in `src/config/api.js` to `http://<your-machine-ip>:3000` to test on a phone on the same Wi-Fi network.

---

## Common Caveats

- `React.StrictMode` is on → `useEffect` runs twice in dev. This can cause double API calls. Production is unaffected.
- Always use `parseResponse()` for API calls — it handles 401/403 centrally and clears the session.
- Sidebar collapsed state is persisted in `localStorage` under key `sidebarCollapsed`.
- Theme is also persisted (via `ThemeContext`); avoid hardcoded colours.
