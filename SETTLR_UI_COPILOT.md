# SETTLR — Complete UI Instructions for GitHub Copilot

> **How to use this file:**
> Open Copilot Chat in VS Code → Click the 📎 paperclip → Attach this file → Start every
> prompt with: _"Read SETTLR_UI_COPILOT.md fully before writing any code. Follow every
> rule. I am learning React so add a short comment above every function explaining what it does."_

---

## TABLE OF CONTENTS

1. [What We Are Building](#1-what-we-are-building)
2. [Tech Stack — Every Tool](#2-tech-stack--every-tool)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Design System — Colors, Fonts, Spacing](#4-design-system--colors-fonts-spacing)
5. [Global Rules Copilot Must Follow Always](#5-global-rules-copilot-must-follow-always)
6. [Page 1 — Login Page](#6-page-1--login-page)
7. [Page 2 — Dashboard](#7-page-2--dashboard)
8. [Page 3 — Send Money Flow](#8-page-3--send-money-flow)
9. [Page 4 — Transaction History + Detail](#9-page-4--transaction-history--detail)
10. [Page 5 — Admin Fraud Panel](#10-page-5--admin-fraud-panel)
11. [Shared Components to Build](#11-shared-components-to-build)
12. [API Integration — How to Connect to Backend](#12-api-integration--how-to-connect-to-backend)
13. [State Management Rules](#13-state-management-rules)
14. [What Copilot Must Never Do](#14-what-copilot-must-never-do)
15. [Exact Copilot Prompts to Use](#15-exact-copilot-prompts-to-use)

---

## 1. WHAT WE ARE BUILDING

**Settlr** is a fintech payment app. The UI has two sides:

### Customer Side (what regular users see)
Normal people who just want to send money and check their balance.
Think: PhonePe or Google Pay — but web-based. Clean, simple, no technical jargon.
- They log in
- They see their balance and recent activity
- They send money to someone in 3 simple steps
- They check their transaction history and see fraud analysis per transaction

### Admin Side (what YOU show to FAANG recruiters)
A powerful internal dashboard showing the system working in real time.
Think: Stripe Dashboard meets an ops monitoring tool.
- Live transaction feed updating every 10 seconds
- Fraud detection signals broken down per transaction
- System health metrics (success rate, latency, volume)
- Flagged transactions that need review

### What This Proves to FAANG Recruiters
- You can build real, production-quality UI — not just backend code
- You understand how fintech products actually work for end users
- The admin panel shows you think about observability and system monitoring
- Dark mode + Stripe-style design shows attention to craft and design systems

---

## 2. TECH STACK — EVERY TOOL

Everything here is **free**. No paid libraries. No credit card needed.

```
React 18              → UI framework (industry standard at every company)
TypeScript            → Type safety (same language as backend)
Vite                  → Build tool (fast, modern — replaces old Create React App)
Tailwind CSS          → Styling (write styles as class names, no CSS files)
React Router v6       → Moving between pages
TanStack Query v5     → Fetching data from backend, caching, loading states
Axios                 → Making HTTP requests
Recharts              → Charts and graphs (free, made for React)
Zustand               → Storing login state globally (lightweight)
React Hook Form       → Handling form inputs
Zod                   → Validating form data (same library as backend)
@hookform/resolvers   → Connects Zod validation to React Hook Form
Lucide React          → Icons (free, clean, minimal — used by Vercel, Linear)
date-fns              → Formatting dates and times
clsx                  → Merging Tailwind class names cleanly
```

### Install Command — Run This Once to Start

```bash
npm create vite@latest settlr-ui -- --template react-ts
cd settlr-ui
npm install \
  react-router-dom \
  @tanstack/react-query \
  axios \
  recharts \
  zustand \
  react-hook-form \
  zod \
  @hookform/resolvers \
  lucide-react \
  date-fns \
  clsx

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 3. PROJECT FOLDER STRUCTURE

Copilot must create files in these exact locations. Every folder has one clear job.
Never put code in the wrong folder.

```
settlr-ui/
│
├── src/
│   │
│   ├── pages/                         ← One file per screen the user sees
│   │   ├── LoginPage.tsx              ← /login
│   │   ├── DashboardPage.tsx          ← /dashboard
│   │   ├── SendMoneyPage.tsx          ← /send
│   │   ├── TransactionsPage.tsx       ← /transactions
│   │   ├── TransactionDetailPage.tsx  ← /transactions/:id
│   │   └── AdminPage.tsx              ← /admin
│   │
│   ├── components/                    ← Reusable UI pieces used across pages
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            ← Left navigation (desktop only)
│   │   │   ├── MobileNav.tsx          ← Bottom navigation (mobile only)
│   │   │   └── AppLayout.tsx          ← Wraps all protected pages
│   │   ├── dashboard/
│   │   │   ├── BalanceCard.tsx        ← Big balance display
│   │   │   ├── StatsRow.tsx           ← 3 stats in a row
│   │   │   ├── ActivityChart.tsx      ← 7-day area chart
│   │   │   └── RecentTransactions.tsx ← Last 5 transactions
│   │   ├── send/
│   │   │   ├── StepIndicator.tsx      ← Step 1 ● ─ ○ ─ ○ progress bar
│   │   │   ├── RecipientStep.tsx      ← Step 1: find who to send to
│   │   │   ├── AmountStep.tsx         ← Step 2: enter amount
│   │   │   └── ConfirmStep.tsx        ← Step 3: review + send
│   │   ├── transactions/
│   │   │   ├── TransactionRow.tsx     ← One row in the list
│   │   │   ├── TransactionFilters.tsx ← Filter dropdowns + search
│   │   │   ├── FraudScoreBadge.tsx    ← Color-coded score badge
│   │   │   ├── FraudSignalRow.tsx     ← One fraud rule result
│   │   │   └── LedgerTable.tsx        ← Debit + credit ledger entries
│   │   ├── admin/
│   │   │   ├── MetricsBar.tsx         ← 4 system metric cards
│   │   │   ├── LiveFeed.tsx           ← Auto-refreshing transaction feed
│   │   │   ├── FraudSignalChart.tsx   ← Bar chart of rule frequencies
│   │   │   └── FlaggedTable.tsx       ← High-risk transactions table
│   │   └── ui/                        ← Tiny generic building blocks
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       ├── Avatar.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── hooks/                         ← Custom React hooks (reusable logic)
│   │   ├── useAuth.ts                 ← Get current user, logout helper
│   │   ├── useTransactions.ts         ← Fetch transaction list
│   │   ├── useSendMoney.ts            ← Send money mutation
│   │   └── useAdminMetrics.ts         ← Fetch admin dashboard data
│   │
│   ├── api/                           ← All backend API calls in one place
│   │   ├── client.ts                  ← Axios instance (adds JWT, handles 401)
│   │   ├── auth.api.ts                ← Login, register
│   │   ├── account.api.ts             ← Balance, account info
│   │   ├── payment.api.ts             ← Send money, get transactions
│   │   └── admin.api.ts               ← Admin metrics and fraud data
│   │
│   ├── store/                         ← Global state (Zustand)
│   │   └── authStore.ts               ← Logged-in user + JWT token
│   │
│   ├── types/                         ← TypeScript type definitions
│   │   └── index.ts                   ← All shared interfaces
│   │
│   ├── lib/                           ← Pure helper functions
│   │   ├── formatCurrency.ts          ← Paise → "₹99.50"
│   │   ├── formatDate.ts              ← ISO string → "2 hours ago"
│   │   └── cn.ts                      ← Merge Tailwind classes safely
│   │
│   ├── App.tsx                        ← Route definitions
│   └── main.tsx                       ← App entry point
│
├── tailwind.config.ts                 ← Custom colors and design tokens
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## 4. DESIGN SYSTEM — COLORS, FONTS, SPACING

This is the Stripe-style dark theme. Every component must use these values.
Copilot must never invent its own colors. Always use the design token class names.

### tailwind.config.ts — Copy This Exactly

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Page backgrounds (darkest to lightest) ───────────────────
        bg: {
          primary:   '#0a0a0f',   // Deepest dark — main page background
          secondary: '#111118',   // Cards and panels
          tertiary:  '#1a1a24',   // Input fields, hover backgrounds
          border:    '#2a2a3a',   // All borders and dividers
        },
        // ── Brand purple (like Stripe's indigo) ─────────────────────
        brand: {
          DEFAULT:   '#6366f1',   // Main brand color
          hover:     '#4f46e5',   // Darker shade for hover states
          light:     '#818cf8',   // Lighter for text on dark bg
          muted:     '#312e81',   // Very dark purple for subtle backgrounds
        },
        // ── Text colors ──────────────────────────────────────────────
        text: {
          primary:   '#f1f5f9',   // Main readable text
          secondary: '#94a3b8',   // Labels, subtitles
          muted:     '#475569',   // Placeholders, disabled states
        },
        // ── Status colors — always use these for transaction status ──
        success: {
          DEFAULT:   '#10b981',
          bg:        '#022c22',   // Dark green card background
          text:      '#6ee7b7',   // Light green readable text
        },
        danger: {
          DEFAULT:   '#ef4444',
          bg:        '#2d0a0a',   // Dark red card background
          text:      '#fca5a5',   // Light red readable text
        },
        warning: {
          DEFAULT:   '#f59e0b',
          bg:        '#2d1a00',   // Dark yellow card background
          text:      '#fcd34d',   // Light yellow readable text
        },
        info: {
          DEFAULT:   '#3b82f6',
          bg:        '#0a1628',   // Dark blue card background
          text:      '#93c5fd',   // Light blue readable text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        card:  '12px',
        input: '8px',
        badge: '6px',
      },
      boxShadow: {
        card:  '0 0 0 1px #2a2a3a',
        glow:  '0 0 20px rgba(99, 102, 241, 0.15)',
        input: '0 0 0 2px rgba(99, 102, 241, 0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Typography — Always Use These Classes

```
Page title:        text-2xl font-bold text-text-primary
Section heading:   text-lg font-semibold text-text-primary
Card label:        text-xs font-medium text-text-secondary uppercase tracking-wider
Body text:         text-sm text-text-primary
Helper text:       text-xs text-text-secondary
Money amount:      text-2xl font-bold font-mono text-text-primary
Error message:     text-xs text-danger-text
```

### Spacing — Consistent Throughout App

```
Page outer padding:   p-6 on desktop, p-4 on mobile
Card padding:         p-6
Space between cards:  gap-4 or gap-6
Input height:         h-11  (44px — big enough to tap on mobile)
Button height:        h-11
Icon size regular:    w-5 h-5
Icon size inline:     w-4 h-4
```

---

## 5. GLOBAL RULES COPILOT MUST FOLLOW ALWAYS

These apply to every file. Read before touching any component.

### 5.1 Component Pattern — Always This Shape

```typescript
// Every component must follow this exact pattern:
// 1. Props interface above the component
// 2. Named export (never default export)
// 3. Short JSDoc comment saying what it does

interface BalanceCardProps {
  balance: number;      // Balance in paise
  isLoading: boolean;
}

/** Shows the user's total balance with animated count-up effect */
export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  // ...component body
}
```

### 5.2 Money Formatting — Never Do Inline Math

```typescript
// src/lib/formatCurrency.ts

/**
 * Converts paise (integer) to a formatted Indian Rupee string.
 * Always use this function — never divide by 100 directly in JSX.
 *
 * Example: formatCurrency(9950)    → "₹99.50"
 * Example: formatCurrency(100000)  → "₹1,000.00"
 * Example: formatCurrency(10000000)→ "₹1,00,000.00"
 */
export function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

// ✅ Correct usage in JSX:
<span>{formatCurrency(transaction.amount)}</span>

// ❌ Never do this:
<span>₹{(transaction.amount / 100).toFixed(2)}</span>
```

### 5.3 Loading / Error / Empty States — Always Handle All Three

```typescript
// Every component that fetches data MUST handle these 3 cases:

function TransactionList() {
  const { data, isLoading, isError, refetch } = useTransactions();

  // 1. Loading state — show skeleton bars, not a spinner
  if (isLoading) return <TransactionListSkeleton />;

  // 2. Error state — show message + retry button
  if (isError) return (
    <EmptyState
      icon={AlertCircle}
      title="Could not load transactions"
      description="Check your connection and try again"
      action={{ label: 'Retry', onClick: refetch }}
    />
  );

  // 3. Empty state — when data exists but list is empty
  if (data.length === 0) return (
    <EmptyState
      icon={CreditCard}
      title="No transactions yet"
      description="Send money to see your history here"
    />
  );

  // 4. Success state — render actual data
  return <div>{data.map(t => <TransactionRow key={t.id} transaction={t} />)}</div>;
}
```

### 5.4 TypeScript — Always Type Everything

```typescript
// src/types/index.ts — Define all interfaces here

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Account {
  id: string;
  userId: string;
  balance: number;    // Always paise (integer)
  currency: 'INR';
  status: 'active' | 'frozen' | 'closed';
}

export interface Transaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromUserName: string;    // Name of sender (from backend join)
  toUserName: string;      // Name of recipient (from backend join)
  amount: number;          // Always paise
  currency: 'INR';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  fraudScore: number;      // 0 to 100
  fraudAction: 'approve' | 'review' | 'challenge' | 'decline';
  description?: string;
  createdAt: string;       // ISO 8601 date string
}

export interface FraudSignal {
  ruleName: string;        // e.g. "VELOCITY_CHECK"
  scoreAdded: number;      // Points this rule added
  data: Record<string, unknown>;  // Rule-specific info
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'debit' | 'credit';
  amount: number;          // In paise
  balanceBefore: number;   // In paise
  balanceAfter: number;    // In paise
  createdAt: string;
}

export interface AdminMetrics {
  totalVolumeToday: number;    // Paise
  successRate: number;         // 0-100 percentage
  fraudBlockRate: number;      // 0-100 percentage
  avgLatencyMs: number;        // Milliseconds
  transactionsPerMinute: number[];  // Last 30 data points
  signalBreakdown: { ruleName: string; count: number }[];
}
```

---

## 6. PAGE 1 — LOGIN PAGE

**Route:** `/login`
**File:** `src/pages/LoginPage.tsx`

### What It Must Look Like

```
Full dark screen (#0a0a0f)

Centered card (max-w-md, centered vertically + horizontally):
┌──────────────────────────────────────────┐
│                                          │
│     ⬡  SETTLR                           │  ← Hexagon icon + bold name
│   Secure Payments Platform              │  ← Small gray tagline
│                                          │
│  Email address                           │  ← Label above input
│  [arjun@example.com               ]     │  ← Input field
│                                          │
│  Password                                │
│  [••••••••••••••••            👁 ]      │  ← Toggle show/hide
│                                          │
│  [         Sign In →          ]          │  ← Full width purple button
│                                          │
│  Don't have an account? Sign up          │  ← Link, centered
│                                          │
└──────────────────────────────────────────┘

Behind the card: large blurred purple circle glow (absolutely positioned)
```

### Complete Requirements List

```
Layout:
  - Background: bg-bg-primary (full screen)
  - Card: bg-bg-secondary rounded-card shadow-card p-8 max-w-md w-full mx-auto
  - Vertical center: use min-h-screen flex items-center justify-center
  - Purple glow: absolute div with w-96 h-96 bg-brand/10 blur-3xl -z-10

Logo:
  - Hexagon icon from lucide-react, size w-8 h-8, color text-brand
  - "SETTLR" text: text-xl font-bold text-text-primary ml-2
  - Tagline below: text-sm text-text-secondary mt-1

Form:
  - React Hook Form + Zod (loginSchema — see below)
  - Email field: type="email", autocomplete="email", placeholder="you@example.com"
  - Password field: type="password", autocomplete="current-password"
  - Password toggle: Eye/EyeOff icon button inside input, switches type
  - Error messages: text-xs text-danger-text below each field (from Zod)

Submit:
  - Full width: w-full h-11 bg-brand hover:bg-brand-hover rounded-input
  - Loading state: disabled + shows <Spinner /> + text "Signing in..."
  - API error: red box above button showing server error message

After success:
  - Call authStore.setAuth(token, user)
  - Navigate to /dashboard using useNavigate()

On page load:
  - If already authenticated: redirect to /dashboard immediately
```

### Zod Validation Schema

```typescript
import { z } from 'zod';

/** Validates the login form — email must be valid, password at least 8 chars */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

## 7. PAGE 2 — DASHBOARD

**Route:** `/dashboard`
**File:** `src/pages/DashboardPage.tsx`

### Full Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (w-64, desktop only, hidden on mobile)                  │
│                                        │  MAIN CONTENT AREA     │
│  ⬡ SETTLR                             │                        │
│                                        │  Good morning, Arjun 👋│
│  ── ──  ──  ──  ──  ──               │  Monday, 15 Jan 2025    │
│  [Avatar] Arjun Kumar                  │                        │
│           arjun@gmail.com             │  ┌────┐  ┌────┐  ┌────┐│
│  ── ──  ──  ──  ──  ──               │  │Bal │  │Sent│  │Rcvd││
│                                        │  │₹24k│  │₹3.2│  │₹1.8││
│  📊 Dashboard     ← active (purple)   │  └────┘  └────┘  └────┘│
│  ↗  Send Money                         │                        │
│  📋 Transactions                       │  [Activity Chart]      │
│                                        │  Sent vs Received      │
│  ── ──  ──  ──  ──  ──               │  7 day area chart       │
│                                        │                        │
│  🚪 Sign Out                           │  Recent Transactions   │
│                                        │  Rahul  -₹500  ✅     │
│                                        │  Priya  +₹2k   ✅     │
│                                        │  [View all →]          │
└────────────────────────────────────────┴────────────────────────┘
```

### Stats Row — 3 Cards (grid-cols-3 desktop, grid-cols-1 mobile)

```
Card 1 — Total Balance:
  Icon: Wallet (Lucide), color text-brand
  Label: "TOTAL BALANCE" (uppercase, text-xs, text-text-secondary)
  Value: ₹24,500.00 (text-3xl font-bold font-mono, animates count-up on load)
  Sub:   "Available to send"
  Left border: 2px solid #6366f1 (brand)

Card 2 — Sent Today:
  Icon: ArrowUpRight (Lucide), color text-danger-DEFAULT
  Label: "SENT TODAY"
  Value: ₹3,200.00
  Sub:   "4 transactions"
  Left border: 2px solid #ef4444 (danger)

Card 3 — Received Today:
  Icon: ArrowDownLeft (Lucide), color text-success-DEFAULT
  Label: "RECEIVED TODAY"
  Value: ₹1,800.00
  Sub:   "2 transactions"
  Left border: 2px solid #10b981 (success)
```

### Activity Chart

```typescript
// Uses Recharts AreaChart
// Component: src/components/dashboard/ActivityChart.tsx

// Data shape from API (amounts in paise):
interface ChartDataPoint {
  day: string;       // "Mon", "Tue", etc.
  sent: number;      // Total sent that day in paise
  received: number;  // Total received that day in paise
}

// Chart requirements:
// - ResponsiveContainer width="100%" height={240}
// - Two AreaChart areas: "sent" (purple #6366f1) and "received" (green #10b981)
// - Both areas: fillOpacity 0.15, strokeWidth 2
// - Custom Tooltip: shows both values formatted with formatCurrency()
// - Tooltip background: bg-bg-secondary, border border-bg-border, rounded-card
// - X axis: day labels, no border, text-text-secondary
// - Y axis: hidden (no numbers on Y axis — cleaner look)
// - No cartesian grid lines
// - Smooth curves: type="monotone" on Area
```

### Recent Transactions List

```
Show last 5 transactions only — not paginated.
"View all transactions →" link at the bottom.

Each row:
  ┌─────────────────────────────────────────────┐
  │ [Avatar] Name           -₹500.00   ✅ Done  │
  │          2 hours ago                         │
  └─────────────────────────────────────────────┘

  - Avatar: circle with 2 initials, color based on name hash
  - Sent money:     amount in text-danger-text, ArrowUpRight icon
  - Received money: amount in text-success-text, ArrowDownLeft icon
  - Status badge: green for completed, yellow for pending
  - "X hours ago" or "X minutes ago" using date-fns formatDistanceToNow()
  - Clicking a row: navigate to /transactions/:id
  - Row hover: bg-bg-tertiary, cursor-pointer, transition-colors
```

### Skeleton Loading

```typescript
// While data is loading, show skeleton bars (not spinner)
// Skeleton is a gray bar with animate-pulse animation

function StatCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-card p-6 shadow-card">
      <div className="h-3 w-24 bg-bg-border rounded animate-pulse mb-4" />
      <div className="h-8 w-32 bg-bg-border rounded animate-pulse mb-2" />
      <div className="h-3 w-20 bg-bg-border rounded animate-pulse" />
    </div>
  );
}
// Same pattern for chart skeleton and transaction list skeleton
```

---

## 8. PAGE 3 — SEND MONEY FLOW

**Route:** `/send`
**File:** `src/pages/SendMoneyPage.tsx`

### The 3 Steps

```
Step 1: Who?  →  Step 2: How much?  →  Step 3: Confirm & Send

Progress bar at top of the form:
  Step 1 active:  ●━━━━━━━○━━━━━━━○
  Step 2 active:  ●━━━━━━━●━━━━━━━○
  Step 3 active:  ●━━━━━━━●━━━━━━━●

  Active step: filled circle, brand purple
  Done step: filled circle, success green
  Future step: empty circle, text-muted
```

### Step 1 — Who Are You Sending To?

```
┌────────────────────────────────────────┐
│  Who are you sending to?               │
│                                        │
│  Email address or Account ID           │
│  [rahul@example.com             ]      │
│                                        │
│  ← when found:                         │
│  ┌──────────────────────────────────┐  │
│  │ [RK] Rahul Kumar                 │  │  ← Green border, found state
│  │      rahul@example.com    ✅     │  │
│  └──────────────────────────────────┘  │
│                                        │
│                      [Continue →]      │
└────────────────────────────────────────┘

Behavior:
  - User types email or UUID
  - Debounce 500ms before calling lookupAccount() API
  - While searching: show small spinner inside input
  - Found: show recipient preview card with green border + checkmark
  - Not found: show "No account found" in text-danger-text
  - Continue button: disabled until valid recipient is confirmed
  - On Continue: save recipient to state, advance to Step 2
```

### Step 2 — How Much?

```
┌────────────────────────────────────────┐
│  Sending to: Rahul Kumar               │
│  [RK] rahul@example.com               │
│                                        │
│  Amount                                │
│  ₹ [    500                     ]     │  ← Big number input
│                                        │
│  Quick amounts:                        │
│  [₹100]  [₹500]  [₹1,000]  [₹2,000]  │  ← Tap to fill
│                                        │
│  Description (optional)               │
│  [Dinner split                  ]     │
│  255 chars remaining                   │
│                                        │
│  Your balance: ₹24,500.00             │
│                                        │
│  ← Back              [Review →]       │
└────────────────────────────────────────┘

Behavior:
  - Amount: type="number", step="0.01", min="1"
  - Quick amount buttons fill the input on click
  - Show error "Insufficient balance" if amount > balance
  - Show error "Minimum amount is ₹1" if amount < 1
  - Show error "Maximum transfer is ₹1,00,000" if amount > 100000
  - Description: maxLength 255, show counter below
  - Convert to paise on submit: Math.round(parseFloat(amount) * 100)
  - Review button: disabled until amount is valid
```

### Step 3 — Confirm and Send

```
┌────────────────────────────────────────┐
│  Review your transfer                  │
│                                        │
│  To:           Rahul Kumar             │
│  Account:      ••••••1234              │  ← Masked, last 4 chars only
│  Amount:       ₹500.00                 │
│  Description:  Dinner split            │
│                                        │
│  ────────────────────────────────      │
│                                        │
│  ← Back     [Confirm & Send →]         │
│                                        │
└────────────────────────────────────────┘

After clicking Confirm:
  - Button: disabled, shows Spinner, text "Sending..."
  - API: POST /api/v1/payments with Idempotency-Key header
  - Idempotency key: generated ONCE with crypto.randomUUID() when Step 3 renders
    (use useRef so it never changes even if component re-renders)

SUCCESS screen:
┌────────────────────────────────────────┐
│                                        │
│         ✅                             │  ← Large green animated checkmark
│                                        │
│    ₹500.00 sent successfully!          │
│    to Rahul Kumar                      │
│                                        │
│    TXN-abc123456                       │  ← Transaction ID + copy button
│                                        │
│  [View Transaction]  [Send Again]      │
│                                        │
└────────────────────────────────────────┘

FAILURE screen:
┌────────────────────────────────────────┐
│         ❌                             │  ← Red X icon
│                                        │
│    Transfer could not be completed     │
│    Insufficient balance                │  ← Actual error from API
│                                        │
│  [Try Again]   [Back to Dashboard]    │
└────────────────────────────────────────┘
```

### Idempotency Key — Critical Implementation

```typescript
// src/components/send/ConfirmStep.tsx

import { useRef } from 'react';

/**
 * IMPORTANT: The idempotency key must be generated ONCE and reused.
 * If the user clicks Confirm twice (network retry), the same key is sent.
 * The backend recognizes it and returns the same response without charging twice.
 * useRef keeps the value stable — it does NOT reset on re-renders.
 */
function ConfirmStep({ fromAccountId, toAccountId, amount, description }: ConfirmStepProps) {
  // Generate key once when this step first renders
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  async function handleConfirm() {
    await sendMoney({
      fromAccountId,
      toAccountId,
      amount,       // Already in paise from previous step
      currency: 'INR',
      description,
      idempotencyKey: idempotencyKey.current,   // Always same key
    });
  }

  // ... rest of component
}
```

### Step State Management

```typescript
// SendMoneyPage.tsx — how to manage the 3-step flow

type Step = 1 | 2 | 3;

interface SendMoneyFlowState {
  step: Step;
  recipient: { id: string; name: string; email: string; accountId: string } | null;
  amountPaise: number;       // Stored in paise after conversion
  description: string;
}

/** All state lives here — child steps read from and write to this */
const [state, setState] = useState<SendMoneyFlowState>({
  step: 1,
  recipient: null,
  amountPaise: 0,
  description: '',
});

function goToStep(step: Step) {
  setState(prev => ({ ...prev, step }));
}

function setRecipient(recipient: SendMoneyFlowState['recipient']) {
  setState(prev => ({ ...prev, recipient }));
}

function setAmount(amountPaise: number, description: string) {
  setState(prev => ({ ...prev, amountPaise, description }));
}
```

---

## 9. PAGE 4 — TRANSACTION HISTORY + DETAIL

### Part A — Transaction List

**Route:** `/transactions`
**File:** `src/pages/TransactionsPage.tsx`

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Transactions                              [+ Send Money]   │
│                                                             │
│  [All ▾]  [This month ▾]  [All Status ▾]  [Search... 🔍]  │
│                                                             │
│  ─── Today ───────────────────────────────────────────     │
│                                                             │
│  [RK] Rahul Kumar         Sent      -₹500.00  ✅ Done  [→] │
│       2 hours ago · Fraud: 12 · Low Risk                    │
│                                                             │
│  [PS] Priya Singh         Received  +₹2,000   ✅ Done  [→] │
│       5 hours ago · Fraud: 8 · Low Risk                     │
│                                                             │
│  ─── Yesterday ────────────────────────────────────────    │
│                                                             │
│  [N]  Netflix             Sent      -₹649.00  ✅ Done  [→] │
│       Yesterday · Fraud: 5 · Low Risk                       │
│                                                             │
│                        [Load more]                          │
└─────────────────────────────────────────────────────────────┘
```

#### Filter Bar

```
4 controls in a horizontal row (wraps on mobile):

1. Type: [All ▾] / [Sent ▾] / [Received ▾]
2. Period: [Today] [This week] [This month] [All time]
3. Status: [All] [Completed] [Pending] [Failed]
4. Search: text input, searches by name or transaction ID
           debounced 400ms before API call
           shows X button to clear when has value

Behavior:
  - All filters change URL query params (?type=sent&period=month&search=rahul)
  - URL-based filters allow sharing or bookmarking filtered views
  - Changing any filter triggers refetch
  - Show total count: "24 transactions" above the list
```

#### Transaction Row Component

```typescript
// src/components/transactions/TransactionRow.tsx

/**
 * Renders one transaction in the list.
 * Clicking navigates to the transaction detail page.
 * Shows avatar, name, type, fraud score badge, amount, status.
 */
export function TransactionRow({ transaction, currentUserId }: TransactionRowProps) {
  const navigate = useNavigate();
  const isSent = transaction.fromAccountId === currentUserId;
  const displayName = isSent ? transaction.toUserName : transaction.fromUserName;

  return (
    <div
      onClick={() => navigate(`/transactions/${transaction.id}`)}
      className="flex items-center gap-4 p-4 hover:bg-bg-tertiary cursor-pointer
                 transition-colors border-b border-bg-border last:border-0"
    >
      <Avatar name={displayName} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{displayName}</p>
        <p className="text-xs text-text-secondary">
          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
        </p>
      </div>
      <FraudScoreBadge score={transaction.fraudScore} />
      <span className={cn(
        'text-sm font-mono font-semibold',
        isSent ? 'text-danger-text' : 'text-success-text'
      )}>
        {isSent ? '-' : '+'}{formatCurrency(transaction.amount)}
      </span>
      <StatusBadge status={transaction.status} />
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </div>
  );
}
```

#### Fraud Score Badge

```typescript
// src/components/transactions/FraudScoreBadge.tsx

/**
 * Color-coded badge showing the fraud risk level.
 * Score  0-29: green  → Low Risk
 * Score 30-59: yellow → Medium Risk
 * Score 60-79: orange → High Risk
 * Score 80+:  red    → Blocked
 */
export function FraudScoreBadge({ score }: { score: number }) {
  if (score < 30) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-badge
                     bg-success-bg text-success-text">
      {score} · Low Risk
    </span>
  );
  if (score < 60) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-badge
                     bg-warning-bg text-warning-text">
      {score} · Review
    </span>
  );
  if (score < 80) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-badge
                     bg-warning-bg text-warning-text">
      {score} · High Risk
    </span>
  );
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-badge
                     bg-danger-bg text-danger-text">
      {score} · Blocked
    </span>
  );
}
```

### Part B — Transaction Detail Page

**Route:** `/transactions/:id`
**File:** `src/pages/TransactionDetailPage.tsx`

#### Full Layout

```
← Back to Transactions

┌─────────────────────────────────────────────────────────────┐
│  [RK] Sent to Rahul Kumar                   ✅ Completed   │
│       15 Jan 2025, 2:30 PM IST                              │
│                                                             │
│  ₹500.00                                                   │
│  "Dinner split"                                             │
│                                                             │
│  Transaction ID                                             │
│  TXN-abc123...xyz  [📋 Copy]                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🛡️ Fraud Analysis                                          │
│                                                             │
│  Risk Score: 12 / 100                   ✅ AUTO APPROVED   │
│  [███░░░░░░░░░░░░░░░░░░░░░░░░░]  12%                       │
│                                                             │
│  Signals Checked (6 rules, ran in parallel):               │
│  ✅ Velocity Check    0 pts   1 transaction in last 60s    │
│  ✅ Amount Anomaly    0 pts   Within your normal range     │
│  ✅ Unusual Hour      0 pts   Sent at 2:30pm IST          │
│  ✅ New Account       0 pts   Account is 45 days old       │
│  ✅ Round Amount      0 pts   ₹500 is not a flagged amount │
│  ✅ Recipient Risk    0 pts   Normal recipient activity     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📒 Ledger Trail                                            │
│                                                             │
│  DEBIT   Your Account                                       │
│  Amount: ₹500.00                                           │
│  Before: ₹25,000.00  →  After: ₹24,500.00                 │
│                                                             │
│  CREDIT  Rahul Kumar's Account                              │
│  Amount: ₹500.00                                           │
│  Before: ₹1,200.00  →  After: ₹1,700.00                   │
│                                                             │
│  ✓ Verified: total debited = total credited. No money lost. │
└─────────────────────────────────────────────────────────────┘
```

#### Fraud Signal Row

```typescript
// src/components/transactions/FraudSignalRow.tsx

// Map internal rule names to friendly display names
const RULE_DISPLAY_NAMES: Record<string, string> = {
  VELOCITY_CHECK:  'Velocity Check',
  AMOUNT_ANOMALY:  'Amount Anomaly',
  UNUSUAL_HOUR:    'Unusual Hour',
  NEW_ACCOUNT:     'New Account',
  ROUND_AMOUNT:    'Round Amount',
  RECIPIENT_RISK:  'Recipient Risk',
};

/**
 * Shows one fraud rule result row.
 * Green checkmark when rule didn't fire (no risk).
 * Red warning when rule fired (added risk points).
 */
export function FraudSignalRow({ signal, fired }: {
  signal: { ruleName: string; scoreAdded: number; description: string };
  fired: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b
                    border-bg-border last:border-0">
      <div className="flex items-center gap-3">
        {fired
          ? <AlertTriangle className="w-4 h-4 text-danger-DEFAULT flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 text-success-DEFAULT flex-shrink-0" />
        }
        <div>
          <p className="text-xs font-mono font-medium text-text-secondary">
            {RULE_DISPLAY_NAMES[signal.ruleName] ?? signal.ruleName}
          </p>
          <p className="text-xs text-text-muted">{signal.description}</p>
        </div>
      </div>
      <span className={cn(
        'text-xs font-mono',
        fired ? 'text-danger-text font-semibold' : 'text-text-muted'
      )}>
        {fired ? `+${signal.scoreAdded} pts` : '0 pts'}
      </span>
    </div>
  );
}
```

---

## 10. PAGE 5 — ADMIN FRAUD PANEL

**Route:** `/admin`
**File:** `src/pages/AdminPage.tsx`

> This is the page that makes FAANG recruiters stop scrolling and actually read your resume.
> It shows you understand observability, monitoring, and how real ops teams work.
> Build it to look like a professional internal tool.

### Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔐 Admin Panel                    ↻ Updated 3 seconds ago  │
├─────────────────────────────────────────────────────────────┤
│  [System Metrics]  [Fraud Monitor]  [Live Feed]             │  ← 3 tabs
└─────────────────────────────────────────────────────────────┘

Auto-refreshes every 10 seconds using refetchInterval in TanStack Query.
"Updated X seconds ago" counter increments every second using setInterval.
```

### Tab 1 — System Metrics

```
4 Metric Cards (grid-cols-4 desktop, grid-cols-2 mobile):
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Volume   │ │ Success  │ │ Blocked  │ │ Latency  │
  │ ₹4.82L  │ │ 99.7%    │ │ 3.2%     │ │ 87ms     │
  │ today    │ │ rate     │ │ by fraud │ │ avg P50  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘

Transactions Per Minute Chart (last 30 data points):
  - Recharts LineChart, responsive, height 200
  - Single line, brand purple, strokeWidth 2
  - Small dots on each point
  - Tooltip showing exact count and timestamp
  - X axis: time labels (every 5 minutes)
  - No Y axis numbers — just the line

Fraud Score Distribution (below chart, 2-column grid):
  Left: Histogram
    0-29:  ████████████████████  94%  (text-success-text)
    30-59: ████░░░░░░░░░░░░░░░░   4%  (text-warning-text)
    60-79: █░░░░░░░░░░░░░░░░░░░   1%  (text-warning-text)
    80+:   █░░░░░░░░░░░░░░░░░░░   1%  (text-danger-text)

  Right: Signal Breakdown (horizontal bar chart)
    VELOCITY    ████████████  42 fires
    AMOUNT      ██████████    28 fires
    HOUR        ██████        15 fires
    NEW ACCT    ████           8 fires
    ROUND       ████           6 fires
    RECIPIENT   ██             3 fires
```

### Tab 2 — Fraud Monitor

```
🚨 Flagged Transactions requiring review

Each card:
┌──────────────────────────────────────────────────────────────┐
│ TXN-xyz789                                    Score: 75 🔴   │
│ Arjun Kumar → Unknown User  ·  ₹50,000                      │
│ 3:15am IST · 15 Jan 2025                                    │
│                                                              │
│ Signals that fired:                                          │
│  🔴 VELOCITY_CHECK  +25  5 transactions in last 60 seconds  │
│  🔴 AMOUNT_ANOMALY  +30  8x above user's average            │
│  🟡 UNUSUAL_HOUR    +10  Sent at 3:15am IST                 │
│  🟡 ROUND_AMOUNT    +10  Exact amount ₹50,000               │
│                                                              │
│  [View Full Detail]           [Mark Safe ✓]  [Confirm Block ✗]│
└──────────────────────────────────────────────────────────────┘

Cards sorted by score descending (highest risk first).
Empty state: "🎉 No flagged transactions right now"
```

### Tab 3 — Live Transaction Feed

```
Live Feed  ● LIVE                                    [Pause ⏸]

Each row shows newest transactions as they come in:
┌──────────────────────────────────────────────────────────────┐
│ 14:32:01  TXN-new123  Rahul → Priya    ₹500    ✅  Score: 8 │
│ 14:31:58  TXN-new122  Anita → Shop     ₹1,200  ✅  Score: 12│
│ 14:31:45  TXN-new121  Vikram → Wallet  ₹5,000  🟡  Score: 35│
│ 14:31:30  TXN-new120  Meera → Cafe     ₹180    ✅  Score: 3 │
│ 14:31:15  TXN-new119  [Unknown]        ₹50,000 🔴  BLOCKED  │
└──────────────────────────────────────────────────────────────┘

Row colors (left border):
  Score < 30: border-l-4 border-success-DEFAULT (green)
  Score 30-79: border-l-4 border-warning-DEFAULT (yellow)
  Score 80+: border-l-4 border-danger-DEFAULT (red) + bg-danger-bg

New rows animate in from the top (translateY + opacity transition).
Keep max 20 rows — remove oldest when new ones arrive.
Pause button stops new rows from appearing (data still fetches).
```

### Auto-Refresh Implementation

```typescript
// src/hooks/useAdminMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

/**
 * Fetches admin metrics. Automatically refetches every 10 seconds.
 * Returns data plus a "secondsAgo" counter for the "Updated X sec ago" display.
 */
export function useAdminMetrics() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(new Date());

  const query = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchAdminMetrics,
    refetchInterval: 10_000,    // Refetch every 10 seconds
    staleTime: 5_000,
  });

  // Update the "last updated X seconds ago" counter every second
  useEffect(() => {
    if (query.dataUpdatedAt) {
      setLastFetchTime(new Date(query.dataUpdatedAt));
      setSecondsAgo(0);
    }
  }, [query.dataUpdatedAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);   // Clean up on unmount
  }, [lastFetchTime]);

  return { ...query, secondsAgo };
}
```

---

## 11. SHARED COMPONENTS TO BUILD

Build these first — every page depends on them.

### AppLayout.tsx — Wraps All Protected Pages

```typescript
/**
 * Layout wrapper for all pages that require login.
 * Shows the sidebar on desktop and bottom nav on mobile.
 * Redirects to /login if user is not authenticated.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  // If not logged in, send to login page
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar: hidden on mobile (md:flex) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      {/* Mobile bottom nav: hidden on desktop (md:hidden) */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
```

### Sidebar.tsx

```
Width: w-64
Background: bg-bg-secondary
Right border: border-r border-bg-border
Full height: h-full

Contents (top to bottom):
  - Logo: Hexagon icon + "SETTLR" text (p-6)
  - Divider line
  - User info: Avatar + name + email (p-4)
  - Divider line
  - Nav links:
      📊 Dashboard    → /dashboard
      ↗  Send Money   → /send
      📋 Transactions → /transactions
  - Spacer (flex-1)
  - Divider line
  - Sign out button (text-danger-text, LogOut icon)

Active link style: bg-brand-muted text-brand-light rounded-input
Inactive link style: text-text-secondary hover:text-text-primary hover:bg-bg-tertiary
```

### Button.tsx

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-brand text-white hover:bg-brand-hover',
  secondary: 'bg-bg-tertiary text-text-primary border border-bg-border hover:bg-bg-border',
  danger:    'bg-danger-bg text-danger-text border border-danger-DEFAULT hover:bg-danger-DEFAULT/20',
  ghost:     'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
};

/**
 * Reusable button. Always use this — never create raw <button> elements.
 * Handles loading state (spinner), disabled state, and all variants.
 */
export function Button({
  label,
  onClick,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'h-11 px-4 rounded-input font-medium text-sm',
        'flex items-center justify-center gap-2',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-brand focus-visible:ring-offset-2',
        'focus-visible:ring-offset-bg-primary',
        variantClasses[variant],
        fullWidth && 'w-full',
      )}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </>
      )}
    </button>
  );
}
```

### Input.tsx

```typescript
/**
 * Text input field with label, error message, and optional icon.
 * Always use this — never use raw <input> elements.
 */
export function Input({
  label,
  error,
  leftIcon: LeftIcon,
  rightElement,
  ...inputProps
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2
                               w-4 h-4 text-text-muted pointer-events-none" />
        )}
        <input
          className={cn(
            'w-full h-11 bg-bg-tertiary rounded-input text-sm text-text-primary',
            'placeholder:text-text-muted border transition-all duration-150',
            'focus:outline-none',
            LeftIcon ? 'pl-10' : 'pl-3',
            rightElement ? 'pr-10' : 'pr-3',
            error
              ? 'border-danger-DEFAULT focus:shadow-none'
              : 'border-bg-border focus:border-brand focus:shadow-input',
          )}
          {...inputProps}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger-text">{error}</p>
      )}
    </div>
  );
}
```

### cn.ts — Tailwind Class Merger

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';

/**
 * Merges Tailwind CSS class names safely.
 * Handles conditional classes and deduplication.
 *
 * Usage: cn('text-sm', condition && 'text-red-500', 'font-bold')
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
```

---

## 12. API INTEGRATION — HOW TO CONNECT TO BACKEND

### Axios Client — One Instance for the Whole App

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * The single Axios instance used for ALL API calls in this app.
 * Automatically adds the JWT token to every request.
 * Automatically redirects to login page on 401 Unauthorized.
 * Never create a new axios instance anywhere else.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,   // Give up after 10 seconds
});

// Add JWT token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state and go to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### All API Functions

```typescript
// src/api/auth.api.ts
export async function loginUser(data: LoginFormData) {
  const response = await apiClient.post('/api/v1/auth/login', data);
  return response.data;  // { token, user }
}

// src/api/account.api.ts
export async function getMyAccount() {
  const response = await apiClient.get('/api/v1/accounts');
  return response.data;  // { account: Account }
}

export async function lookupAccount(query: string) {
  const response = await apiClient.get('/api/v1/accounts/lookup', { params: { q: query } });
  return response.data;  // { account: Account } or null
}

export async function getWeeklyStats() {
  const response = await apiClient.get('/api/v1/accounts/stats/weekly');
  return response.data;  // ChartDataPoint[]
}

// src/api/payment.api.ts
export async function getTransactions(filters?: TransactionFilters) {
  const response = await apiClient.get('/api/v1/payments', { params: filters });
  return response.data;  // { transactions: Transaction[], total: number }
}

export async function getTransactionById(id: string) {
  const response = await apiClient.get(`/api/v1/payments/${id}`);
  return response.data;  // { transaction, signals: FraudSignal[], ledger: LedgerEntry[] }
}

export async function sendMoney(params: SendMoneyParams) {
  const { idempotencyKey, ...body } = params;
  const response = await apiClient.post('/api/v1/payments', body, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
  return response.data;  // { transaction: Transaction }
}

// src/api/admin.api.ts
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const response = await apiClient.get('/api/v1/admin/metrics');
  return response.data;
}

export async function getFlaggedTransactions() {
  const response = await apiClient.get('/api/v1/admin/flagged');
  return response.data;  // { transactions: Transaction[] }
}
```

### TanStack Query Hooks

```typescript
// src/hooks/useTransactions.ts
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches and caches the transaction list.
 * Automatically re-fetches when filters change.
 * Keeps previous data visible while new data loads (no blank flash).
 */
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],     // Unique cache key per filter combo
    queryFn: () => getTransactions(filters),
    staleTime: 30_000,                       // 30 seconds before refetch
    placeholderData: (prev) => prev,         // Show old data while fetching new
  });
}

// src/hooks/useSendMoney.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for sending money.
 * After success, automatically refreshes the transaction list and balance.
 */
export function useSendMoney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMoney,
    onSuccess: () => {
      // Invalidate these cache keys — causes them to refetch automatically
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });
}
```

---

## 13. STATE MANAGEMENT RULES

### Zustand Auth Store

```typescript
// src/store/authStore.ts
import { create } from 'zustand';

/**
 * Global authentication state.
 * Stores the JWT token IN MEMORY ONLY — never in localStorage.
 * This means logging out or refreshing the page clears the session (by design).
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  /** Called after successful login. Saves token and user info. */
  setAuth: (token: string, user: User) => set({
    token,
    user,
    isAuthenticated: true,
  }),

  /** Called on logout or 401 error. Clears everything. */
  logout: () => set({
    token: null,
    user: null,
    isAuthenticated: false,
  }),
}));
```

### What Lives Where

```
Zustand store:                   TanStack Query:
  ✅ JWT token                     ✅ Transactions list
  ✅ Logged-in user object          ✅ Account balance
  ✅ isAuthenticated flag           ✅ Transaction detail
  ✅ (future) theme preference      ✅ Admin metrics

  ❌ Never put API data here        ❌ Never put auth token here
```

---

## 14. WHAT COPILOT MUST NEVER DO

### Styling
- ❌ Never use inline styles — `style={{ color: 'red' }}` is banned
- ❌ Never create `.css` files — use only Tailwind classes
- ❌ Never hardcode hex colors — use the design token classes (`text-brand`, `bg-danger-bg`)
- ❌ Never use arbitrary Tailwind values like `px-[16px]` — use the scale (`px-4`)

### Security
- ❌ Never store JWT in `localStorage` or `sessionStorage`
- ❌ Never log the JWT token to console
- ❌ Never show full account IDs — always mask to last 4 characters (`••••1234`)
- ❌ Never put API keys or secrets in any frontend file

### React Patterns
- ❌ Never use class components — only functional components with hooks
- ❌ Never use `useEffect` to fetch data — always use TanStack Query hooks
- ❌ Never use `window.location.href` for navigation — always `useNavigate()`
- ❌ Never use default exports — always named exports
- ❌ Never use the `any` TypeScript type
- ❌ Never divide money by 100 inline in JSX — use `formatCurrency()`
- ❌ Never create a new Axios instance — use `apiClient` from `src/api/client.ts`

### UX
- ❌ Never show a blank screen while loading — always show skeleton bars
- ❌ Never keep a button clickable during an API call — disable + spinner
- ❌ Never use `alert()` or `confirm()` browser popups — use inline UI
- ❌ Never navigate away immediately after sending money — show success screen first
- ❌ Never show raw error objects to users — always show a friendly message

---

## 15. EXACT COPILOT PROMPTS TO USE

Attach this file first, then paste these prompts exactly.

### Project Setup
```
Read SETTLR_UI_COPILOT.md fully.

Create:
1. tailwind.config.ts from Section 4 exactly as written
2. Empty files matching the folder structure in Section 3
3. src/lib/cn.ts — the Tailwind class merger
4. src/lib/formatCurrency.ts — paise to rupee formatter
5. src/lib/formatDate.ts — uses date-fns formatDistanceToNow
6. src/types/index.ts — all interfaces from Section 5.4
7. src/api/client.ts — Axios instance from Section 12
8. src/store/authStore.ts — Zustand store from Section 13

Add a JSDoc comment above every function explaining what it does.
I am learning React so keep comments beginner-friendly.
```

### Login Page
```
Read SETTLR_UI_COPILOT.md Section 6.

Build src/pages/LoginPage.tsx.
Build src/components/ui/Button.tsx, Input.tsx, Spinner.tsx (from Section 11).

Login page requirements:
- Dark background, centered card, purple glow behind card
- SETTLR logo: Hexagon icon from lucide-react + bold text
- React Hook Form + Zod (loginSchema from Section 6)
- Password show/hide toggle with Eye/EyeOff icons
- Loading spinner in button during API call
- Red error box when login fails
- Redirect to /dashboard if already authenticated
- Add JSDoc comments on every function
```

### Dashboard
```
Read SETTLR_UI_COPILOT.md Section 7.

Build:
- src/pages/DashboardPage.tsx
- src/components/layout/AppLayout.tsx (redirects if not logged in)
- src/components/layout/Sidebar.tsx
- src/components/dashboard/StatsRow.tsx (3 cards)
- src/components/dashboard/ActivityChart.tsx (Recharts AreaChart)
- src/components/dashboard/RecentTransactions.tsx (last 5)
- src/components/ui/Avatar.tsx (initials, deterministic color)

Requirements:
- Skeleton loaders while data loads (animate-pulse gray bars)
- Balance shows as large number, format with formatCurrency()
- Chart: 7 days, two area lines (sent purple, received green)
- Greeting: Good morning/afternoon/evening based on hour
- Recent transactions clickable → navigate to /transactions/:id
- All data fetched with useQuery hooks (never useEffect)
- JSDoc comments on every function and hook
```

### Send Money Flow
```
Read SETTLR_UI_COPILOT.md Section 8 fully.

Build:
- src/pages/SendMoneyPage.tsx (manages 3-step state)
- src/components/send/StepIndicator.tsx
- src/components/send/RecipientStep.tsx (debounced search + preview)
- src/components/send/AmountStep.tsx (amount + quick buttons)
- src/components/send/ConfirmStep.tsx (review + send + success/fail)
- src/hooks/useSendMoney.ts

Critical requirements (read carefully):
- Step state lives in SendMoneyPage only — pass down as props
- Idempotency key: useRef(crypto.randomUUID()) in ConfirmStep — NEVER regenerated
- User inputs rupees, convert to paise: Math.round(parseFloat(value) * 100)
- Recipient search debounced 500ms using setTimeout + clearTimeout
- Success screen shows green checkmark + copyable transaction ID
- Failure screen shows exact error message from API response
- JSDoc comments explaining each step's purpose for a beginner
```

### Transaction History + Detail
```
Read SETTLR_UI_COPILOT.md Section 9 fully.

Build:
- src/pages/TransactionsPage.tsx (list + filters)
- src/pages/TransactionDetailPage.tsx (detail + fraud + ledger)
- src/components/transactions/TransactionRow.tsx
- src/components/transactions/TransactionFilters.tsx
- src/components/transactions/FraudScoreBadge.tsx
- src/components/transactions/FraudSignalRow.tsx
- src/components/transactions/LedgerTable.tsx
- src/hooks/useTransactions.ts

Requirements:
- Transactions grouped by date with dividers ("Today", "Yesterday", date)
- Filters update URL query params — use useSearchParams() from react-router
- FraudScoreBadge: green under 30, yellow 30-59, orange 60-79, red 80+
- Account IDs masked: show only last 4 chars
- Detail page: fraud progress bar + all 6 signal rows + ledger table
- JSDoc comments on every component
```

### Admin Panel
```
Read SETTLR_UI_COPILOT.md Section 10 fully.

Build:
- src/pages/AdminPage.tsx (3 tabs: Metrics, Fraud Monitor, Live Feed)
- src/components/admin/MetricsBar.tsx (4 stat cards)
- src/components/admin/FraudSignalChart.tsx (Recharts bar chart)
- src/components/admin/FlaggedTable.tsx
- src/components/admin/LiveFeed.tsx
- src/hooks/useAdminMetrics.ts (auto-refresh every 10s)

Requirements:
- refetchInterval: 10_000 in TanStack Query
- "Updated X seconds ago" counter using setInterval every 1 second
- Live feed: new rows animate in from top (CSS opacity + translateY)
- Row left border color based on fraud score (green/yellow/red)
- Max 20 rows in live feed — drop oldest
- Pause button stops UI updates (data still fetches in background)
- Flagged tab: sorted by fraud score descending
- JSDoc comments explaining auto-refresh for a learner
```

### Code Review Prompt
```
Review the code you just generated against SETTLR_UI_COPILOT.md.

Check for these violations:
1. Inline styles used (style={{...}}) — should be Tailwind classes
2. Hardcoded hex colors — should use design token class names
3. JWT stored in localStorage — should be Zustand only
4. useEffect used for data fetching — should use TanStack Query
5. any TypeScript type — should never appear
6. Money divided by 100 inline in JSX — should use formatCurrency()
7. Default exports — should be named exports
8. Missing loading or error states on data-fetching components
9. Raw <button> or <input> elements — should use Button/Input components
10. window.location.href for navigation — should use useNavigate()

List every issue with the file name, line number, and the exact fix.
```

---

## QUICK REFERENCE — PRINT AND KEEP HANDY

```
Colors (Tailwind classes, never hex):
  Page bg:        bg-bg-primary
  Card bg:        bg-bg-secondary
  Input bg:       bg-bg-tertiary
  Border:         border-bg-border
  Brand purple:   bg-brand / text-brand
  Main text:      text-text-primary
  Subtext:        text-text-secondary
  Success green:  text-success-text / bg-success-bg
  Danger red:     text-danger-text / bg-danger-bg
  Warning yellow: text-warning-text / bg-warning-bg

Money:
  Display:     formatCurrency(amountInPaise) → "₹99.50"
  User input:  Math.round(parseFloat(rupeesInput) * 100) → paise
  NEVER:       (amount / 100) inline in JSX

Files go here:
  Pages:          src/pages/[Name]Page.tsx
  Generic UI:     src/components/ui/[Name].tsx
  Feature UI:     src/components/[feature]/[Name].tsx
  API functions:  src/api/[service].api.ts
  Query hooks:    src/hooks/use[Name].ts
  Global state:   src/store/[name]Store.ts

Data fetching:
  GET data:       useQuery({ queryKey, queryFn })
  POST/mutate:    useMutation({ mutationFn })
  NEVER:          useEffect for API calls

Exports:          Always NAMED. Never default.
Auth token:       Zustand store only. Never localStorage.
Navigation:       useNavigate() always. Never window.location.href
```

---

*This file is the single source of truth for all Settlr UI code.*
*For backend rules, see: SETTLR_COPILOT.md*
