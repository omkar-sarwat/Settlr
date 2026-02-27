# SETTLR UI — World-Class Frontend Instructions for GitHub Copilot

> **How to use:** Attach this file + SETTLR_COPILOT.md to every Copilot session.
> Start with: _"Read SETTLR_UI_COPILOT.md and SETTLR_COPILOT.md fully. I am learning
> React. After every component explain what it does in simple words. Follow every rule."_

---

## TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Design Style — Glassmorphism + Dark](#2-design-style--glassmorphism--dark)
3. [Complete Color System](#3-complete-color-system)
4. [Typography System](#4-typography-system)
5. [Animation System — Framer Motion](#5-animation-system--framer-motion)
6. [Complete Folder Structure](#6-complete-folder-structure)
7. [Tech Stack](#7-tech-stack)
8. [Tailwind Config — Full File](#8-tailwind-config--full-file)
9. [Global CSS — Full File](#9-global-css--full-file)
10. [Shared Components Library](#10-shared-components-library)
11. [Page 1 — Dashboard](#11-page-1--dashboard)
12. [Page 2 — Send Money](#12-page-2--send-money)
13. [Page 3 — Transaction History](#13-page-3--transaction-history)
14. [Page 4 — Admin Fraud Panel](#14-page-4--admin-fraud-panel)
15. [Layout + Navigation](#15-layout--navigation)
16. [Micro-Interactions Catalog](#16-micro-interactions-catalog)
17. [What Copilot Must Never Do](#17-what-copilot-must-never-do)
18. [Exact Copilot Prompts](#18-exact-copilot-prompts)

---

## 1. DESIGN PHILOSOPHY

### The Big Idea
Settlr UI must feel like **money moving through glass** — deep dark backgrounds,
glowing neon accents, frosted glass cards layered on top of each other, and
animations that feel physical and real. Every interaction must give the user
feedback. Every number must feel alive.

### Three Design Pillars

**PILLAR 1 — GLASSMORPHISM (Primary Style)**
Cards look like frosted glass. You can see depth behind them. Borders glow
subtly. Background has animated gradient orbs that drift slowly. Used on:
all cards, modals, panels, the sidebar.
```css
/* The glass recipe — Copilot must use this on every card */
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

**PILLAR 2 — NEON GLOW ACCENTS**
Primary actions glow indigo-violet. Success glows emerald. Danger glows red.
Numbers that change animate with a counting effect. Charts glow under their lines.
```css
/* Neon button glow */
box-shadow: 0 0 20px rgba(99, 102, 241, 0.4),
            0 0 60px rgba(99, 102, 241, 0.15);
```

**PILLAR 3 — FLUID MOTION (Framer Motion)**
Nothing appears instantly. Everything slides, fades, scales. Page transitions
feel like moving between rooms. List items stagger in 50ms apart. Numbers
count up when they first appear. Charts draw themselves left to right.

### What This Looks Like vs Competitors
- Stripe: Sharp, minimal, lots of white → Settlr: Deep dark, glowing, layered
- Revolut: Colourful gradients → Settlr: Controlled dark with selective neon pops
- Cash App: Neon green on black → Settlr: Indigo-violet on near-black with glass

### The User Should Feel
> "This feels like a premium app. Like it was designed by a team of 20.
> Everything moves perfectly. I trust this with my money."

---

## 2. DESIGN STYLE — GLASSMORPHISM + DARK

### Why Glassmorphism for Settlr
Glassmorphism works best when:
- Background has depth and color (animated gradient orbs provide this)
- Cards need to feel premium and trustworthy
- Data needs to be readable at a glance

We use a hybrid approach researched from the world's best fintech apps:
- Glassmorphism for cards and panels (Revolut-inspired depth)
- Neon glow accents for CTAs and status (Cash App energy)
- Spring physics animations via Framer Motion (used by Figma and Framer)
- Stagger list reveals (Wealthsimple-style emotional intelligence)

### The Background System
The page background is NOT flat black. It has:
1. Base: #050508 — near black with blue tint
2. Animated orb 1: rgba(99, 102, 241, 0.15) — indigo, drifts top-left
3. Animated orb 2: rgba(139, 92, 246, 0.10) — violet, drifts bottom-right
4. Animated orb 3: rgba(16, 185, 129, 0.08) — emerald, subtle center

Orbs use CSS keyframe animations at 20-30s duration — never distracting, just alive.
This makes glassmorphism work because glass needs something colorful behind it.

### Glass Card Variants

```
VARIANT 1 — Standard Card (most common)
  bg: rgba(255,255,255,0.03) | blur: 20px | border: rgba(255,255,255,0.08)

VARIANT 2 — Elevated Card (stat cards, balance display)
  bg: rgba(255,255,255,0.05) | blur: 24px | border: rgba(255,255,255,0.10)
  extra inner glow: inset 0 1px 0 rgba(255,255,255,0.08)

VARIANT 3 — Accent Card (primary actions, highlighted sections)
  bg: rgba(99,102,241,0.08) | blur: 24px | border: rgba(99,102,241,0.20)
  glow: 0 0 30px rgba(99,102,241,0.15)

VARIANT 4 — Danger Card (fraud alerts, failed transactions)
  bg: rgba(239,68,68,0.06) | blur: 20px | border: rgba(239,68,68,0.20)
  glow: 0 0 20px rgba(239,68,68,0.10)

VARIANT 5 — Success Card (completed payments)
  bg: rgba(16,185,129,0.06) | blur: 20px | border: rgba(16,185,129,0.20)
  glow: 0 0 20px rgba(16,185,129,0.10)
```

---

## 3. COMPLETE COLOR SYSTEM

Add all of these to tailwind.config.ts under theme.extend.colors.

```typescript
colors: {
  // BACKGROUNDS
  bg: {
    base:    '#050508',   // Page background — near black with blue tint
    surface: '#0d0d14',   // Sidebar background
    card:    '#11111c',   // Card base before glass effect
    hover:   '#16162a',   // Card on hover
    input:   '#0a0a15',   // Input fields
  },

  // BORDERS
  border: {
    subtle:  'rgba(255,255,255,0.06)',   // Most borders
    soft:    'rgba(255,255,255,0.10)',   // Elevated card borders
    medium:  'rgba(255,255,255,0.15)',   // Active/focused borders
    accent:  'rgba(99,102,241,0.30)',    // Indigo accent borders
    success: 'rgba(16,185,129,0.30)',    // Success borders
    danger:  'rgba(239,68,68,0.30)',     // Danger borders
  },

  // PRIMARY — Indigo-Violet
  primary: {
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',   // MAIN PRIMARY
    600: '#4f46e5',
    700: '#4338ca',
    glow: 'rgba(99,102,241,0.40)',
    soft: 'rgba(99,102,241,0.10)',
  },

  // SUCCESS — Emerald
  success: {
    400: '#34d399',
    500: '#10b981',   // MAIN SUCCESS
    600: '#059669',
    glow: 'rgba(16,185,129,0.40)',
    soft: 'rgba(16,185,129,0.10)',
  },

  // DANGER — Red
  danger: {
    400: '#f87171',
    500: '#ef4444',   // MAIN DANGER
    600: '#dc2626',
    glow: 'rgba(239,68,68,0.40)',
    soft: 'rgba(239,68,68,0.10)',
  },

  // WARNING — Amber
  warning: {
    400: '#fbbf24',
    500: '#f59e0b',   // MAIN WARNING
    600: '#d97706',
    glow: 'rgba(245,158,11,0.40)',
    soft: 'rgba(245,158,11,0.10)',
  },

  // TEXT
  text: {
    primary:  '#f1f5f9',   // Main content
    secondary:'#94a3b8',   // Supporting text
    muted:    '#475569',   // Placeholder, disabled
    ghost:    '#334155',   // Very subtle
  },

  // CHART
  chart: {
    line:     '#6366f1',
    fill:     'rgba(99,102,241,0.15)',
    grid:     'rgba(255,255,255,0.04)',
    sent:     '#ef4444',
    received: '#10b981',
  },
}
```

---

## 4. TYPOGRAPHY SYSTEM

```typescript
// tailwind.config.ts additions
fontFamily: {
  sans:    ['Inter', 'system-ui', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
  display: ['Inter', 'system-ui', 'sans-serif'],
},
fontSize: {
  'balance': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
  'amount':  ['2rem',   { lineHeight: '1', letterSpacing: '-0.03em' }],
  'stat':    ['1.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
},
```

### Typography Rules
- Balance and large money amounts: font-display font-bold tracking-tight
- Transaction amounts in lists: font-mono so digits align perfectly
- Currency symbol ₹: text-text-secondary — slightly dimmer than the number
- IDs and codes: font-mono text-xs text-text-muted
- Never use font sizes below text-xs — too hard to read on dark backgrounds
- Headings: white, font-semibold, tight letter spacing
- Body text: text-text-secondary (#94a3b8) — not pure white, reduces eye strain

---

## 5. ANIMATION SYSTEM — FRAMER MOTION

Install: npm install framer-motion

### The Animation Timing Rules
- Micro interactions (button press, hover): 150-200ms
- Panel slides, modals appearing: 250-350ms
- Page transitions: 300-400ms
- Number counting animations: 800-1200ms with easeOut
- Chart draws: 1000-1500ms with easeInOut
- List stagger delay between items: 50ms
- Always use spring physics — feels more natural than easing curves
- Always respect prefers-reduced-motion accessibility setting

### Standard Animation Variants — Use These Everywhere

```typescript
// src/animations/variants.ts — Create this file exactly as shown

export const fadeInUp = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
};

export const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.2 },
};

export const slideInRight = {
  initial:  { opacity: 0, x: 40 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: 40 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};

export const slideInLeft = {
  initial:  { opacity: 0, x: -40 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: -40 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};

export const scaleIn = {
  initial:  { opacity: 0, scale: 0.92 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// Use staggerContainer on the parent div of a list
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

// Use staggerItem on each list item inside staggerContainer
export const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// Wrap entire page content with this
export const pageTransition = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeInOut' },
};
```

### Number Counting Animation Hook

```typescript
// src/hooks/useCountUp.ts
// Makes numbers count up from 0 when they first appear on screen

import { useEffect, useState, useRef } from 'react';

export function useCountUp(target: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min(
        (timestamp - startTimeRef.current) / duration, 1
      );
      // Ease out cubic — fast at start, slows at end
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}
```

### Specific Animation Code Per Element

**Every button:**
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
```

**Every card on page load (stagger):**
```tsx
<motion.div variants={staggerContainer} initial="initial" animate="animate">
  <motion.div variants={staggerItem}>{/* Card 1 */}</motion.div>
  <motion.div variants={staggerItem}>{/* Card 2 */}</motion.div>
  <motion.div variants={staggerItem}>{/* Card 3 */}</motion.div>
</motion.div>
```

**Transaction list items:**
```tsx
<AnimatePresence>
  {transactions.map((txn, i) => (
    <motion.div
      key={txn.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
    />
  ))}
</AnimatePresence>
```

**Success checkmark SVG animation:**
```tsx
// Draws a checkmark circle using SVG path animation
<motion.svg viewBox="0 0 50 50" width={80} height={80}>
  <motion.circle
    cx={25} cy={25} r={24}
    fill="none" stroke="#10b981" strokeWidth={2}
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  />
  <motion.path
    d="M14 25 L21 33 L36 17"
    fill="none" stroke="#10b981" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
  />
</motion.svg>
```

**Fraud score circular gauge:**
```tsx
// Circular gauge fills based on fraud score 0-100
const radius = 54;
const circumference = 2 * Math.PI * radius;
const strokeOffset = circumference - (score / 100) * circumference;
// Animate strokeDashoffset from circumference to strokeOffset
<motion.circle
  strokeDasharray={circumference}
  initial={{ strokeDashoffset: circumference }}
  animate={{ strokeDashoffset: strokeOffset }}
  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
/>
```

**Side panel slide-in:**
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      className="fixed right-0 top-0 h-full w-[480px] glass-panel z-50"
    />
  )}
</AnimatePresence>
```

---

## 6. COMPLETE FOLDER STRUCTURE

```
settlr-frontend/
├── public/
│
├── src/
│   ├── animations/
│   │   └── variants.ts            ← All Framer Motion variants (from Section 5)
│   │
│   ├── api/
│   │   ├── axios.ts               ← Axios instance with JWT interceptor
│   │   ├── accounts.api.ts        ← Account API functions
│   │   ├── payments.api.ts        ← Payment API functions
│   │   └── admin.api.ts           ← Admin fraud API functions
│   │
│   ├── components/
│   │   ├── ui/                    ← Tiny reusable building blocks
│   │   │   ├── GlassCard.tsx      ← Glass card wrapper component
│   │   │   ├── GlowButton.tsx     ← Primary neon glow button
│   │   │   ├── GhostButton.tsx    ← Secondary transparent button
│   │   │   ├── Badge.tsx          ← Status badges (success/danger/warning)
│   │   │   ├── AmountDisplay.tsx  ← Formatted rupee amount with countUp
│   │   │   ├── Spinner.tsx        ← Loading spinner with glow
│   │   │   ├── Avatar.tsx         ← User avatar with initials fallback
│   │   │   └── Skeleton.tsx       ← Loading skeleton shimmer
│   │   │
│   │   ├── charts/
│   │   │   ├── VolumeChart.tsx    ← 7-day area chart (dashboard)
│   │   │   ├── FraudBarChart.tsx  ← Fraud signals bar chart (admin)
│   │   │   └── FraudGauge.tsx     ← Circular fraud score gauge
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      ← Main wrapper with sidebar + orb background
│   │   │   ├── Sidebar.tsx        ← Glass navigation sidebar
│   │   │   ├── TopBar.tsx         ← Top bar with user menu
│   │   │   └── PageWrapper.tsx    ← Wraps pages with fade transition
│   │   │
│   │   └── features/              ← Feature-specific components
│   │       ├── dashboard/
│   │       │   ├── BalanceCard.tsx
│   │       │   ├── StatCard.tsx
│   │       │   └── RecentActivity.tsx
│   │       ├── payments/
│   │       │   ├── StepRecipient.tsx
│   │       │   ├── StepAmount.tsx
│   │       │   ├── StepConfirm.tsx
│   │       │   ├── SuccessScreen.tsx
│   │       │   └── ErrorScreen.tsx
│   │       ├── transactions/
│   │       │   ├── TransactionRow.tsx
│   │       │   ├── TransactionDetail.tsx   ← Slide-in panel
│   │       │   ├── LedgerTrail.tsx
│   │       │   └── FraudSignalList.tsx
│   │       └── admin/
│   │           ├── MetricCard.tsx
│   │           ├── FlaggedTable.tsx
│   │           └── SignalBreakdown.tsx
│   │
│   ├── hooks/
│   │   ├── useCountUp.ts          ← Number counting animation (Section 5)
│   │   ├── useTransactions.ts     ← React Query for transaction data
│   │   ├── useAccount.ts          ← React Query for account data
│   │   └── useAuth.ts             ← Auth state from Zustand
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SendMoneyPage.tsx
│   │   ├── TransactionHistoryPage.tsx
│   │   └── admin/
│   │       └── FraudPanelPage.tsx
│   │
│   ├── store/
│   │   └── authStore.ts           ← Zustand: stores JWT + user info
│   │
│   ├── types/
│   │   └── index.ts               ← All TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── formatters.ts          ← formatCurrency, timeAgo, formatDate
│   │   └── constants.ts           ← Route names, API base URL
│   │
│   ├── App.tsx                    ← Routes
│   ├── main.tsx                   ← Entry point
│   └── index.css                  ← Global styles + glass utilities
│
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 7. TECH STACK

```bash
# Step 1 — Create project
npm create vite@latest settlr-frontend -- --template react-ts
cd settlr-frontend

# Step 2 — Install everything
npm install react-router-dom axios @tanstack/react-query zustand
npm install framer-motion recharts lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install date-fns clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### Why Each Tool

| Tool | Why We Use It |
|------|---------------|
| Framer Motion | Best animation library for React. Powers Figma and Framer. Spring physics |
| Recharts | Best React chart library. Composable, TypeScript-friendly, customizable |
| Lucide React | Best icon set. Thin, consistent, 1000+ icons, tree-shakeable |
| TanStack Query | Handles loading/error/caching for API calls automatically |
| Zustand | Simpler than Redux. Perfect for JWT auth state |
| date-fns | Lightweight date library. formatDistanceToNow for "2 mins ago" style |
| clsx | Conditional className merging — clsx('base', condition && 'extra') |
| tailwind-merge | Prevents Tailwind class conflicts when combining class strings |

---

## 8. TAILWIND CONFIG — FULL FILE

```typescript
// tailwind.config.ts — Copy this file exactly
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#050508',
          surface: '#0d0d14',
          card:    '#11111c',
          hover:   '#16162a',
          input:   '#0a0a15',
        },
        border: {
          subtle:  'rgba(255,255,255,0.06)',
          soft:    'rgba(255,255,255,0.10)',
          medium:  'rgba(255,255,255,0.15)',
          accent:  'rgba(99,102,241,0.30)',
          success: 'rgba(16,185,129,0.30)',
          danger:  'rgba(239,68,68,0.30)',
        },
        primary: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          glow: 'rgba(99,102,241,0.40)',
          soft: 'rgba(99,102,241,0.10)',
        },
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          glow: 'rgba(16,185,129,0.40)',
          soft: 'rgba(16,185,129,0.10)',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          glow: 'rgba(239,68,68,0.40)',
          soft: 'rgba(239,68,68,0.10)',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          glow: 'rgba(245,158,11,0.40)',
          soft: 'rgba(245,158,11,0.10)',
        },
        text: {
          primary:   '#f1f5f9',
          secondary: '#94a3b8',
          muted:     '#475569',
          ghost:     '#334155',
        },
        chart: {
          line:     '#6366f1',
          fill:     'rgba(99,102,241,0.15)',
          grid:     'rgba(255,255,255,0.04)',
          sent:     '#ef4444',
          received: '#10b981',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'balance': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'amount':  ['2rem',   { lineHeight: '1', letterSpacing: '-0.03em' }],
        'stat':    ['1.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      backdropBlur: {
        xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px',
      },
      boxShadow: {
        'glass':        '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover':  '0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
        'glow-primary': '0 0 20px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15)',
        'glow-success': '0 0 20px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)',
        'glow-danger':  '0 0 20px rgba(239,68,68,0.4),  0 0 60px rgba(239,68,68,0.15)',
        'glow-warning': '0 0 20px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.15)',
        'inner-glow':   'inset 0 1px 0 rgba(255,255,255,0.08)',
        'card':         '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover':   '0 8px 40px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        '2xl': '16px', '3xl': '20px', '4xl': '28px',
      },
      animation: {
        'orb-1':      'orb1 25s ease-in-out infinite',
        'orb-2':      'orb2 30s ease-in-out infinite',
        'orb-3':      'orb3 20s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
      },
      keyframes: {
        orb1: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '33%':      { transform: 'translate(5%, -8%) scale(1.1)' },
          '66%':      { transform: 'translate(-5%, 5%) scale(0.95)' },
        },
        orb2: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%':      { transform: 'translate(-8%, -5%) scale(1.05)' },
        },
        orb3: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '40%':      { transform: 'translate(5%, 8%) scale(1.08)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(99,102,241,0.3)' },
          '50%':      { boxShadow: '0 0 30px rgba(99,102,241,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 9. GLOBAL CSS — FULL FILE

```css
/* src/index.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --glass-bg:     rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --orb-1:        rgba(99,  102, 241, 0.15);
  --orb-2:        rgba(139, 92,  246, 0.10);
  --orb-3:        rgba(16,  185, 129, 0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: #050508;
  color: #f1f5f9;
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.10);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }

/* Text selection */
::selection { background: rgba(99,102,241,0.30); color: #f1f5f9; }

@layer components {

  /* Standard glass card */
  .glass {
    background: rgba(255,255,255,0.03);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  }

  /* Elevated glass — important cards */
  .glass-elevated {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 20px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  /* Accent glass — primary action areas */
  .glass-accent {
    background: rgba(99,102,241,0.08);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(99,102,241,0.20);
    border-radius: 20px;
    box-shadow: 0 0 30px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
  }

  /* Slide-in panel (Transaction Detail) */
  .glass-panel {
    background: rgba(13,13,20,0.90);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-left: 1px solid rgba(255,255,255,0.08);
    box-shadow: -20px 0 60px rgba(0,0,0,0.6);
  }

  /* Primary neon button */
  .btn-primary {
    @apply relative px-6 py-3 rounded-2xl font-semibold text-white
           bg-primary-500 transition-all duration-200 overflow-hidden;
    box-shadow: 0 0 20px rgba(99,102,241,0.3);
  }
  .btn-primary::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    border-radius: inherit;
    pointer-events: none;
  }
  .btn-primary:hover {
    box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.15);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(0); }

  /* Ghost button */
  .btn-ghost {
    @apply px-6 py-3 rounded-2xl font-medium text-text-secondary
           border border-border-subtle bg-transparent transition-all duration-200;
  }
  .btn-ghost:hover {
    @apply text-text-primary border-border-medium;
    background: rgba(255,255,255,0.04);
  }

  /* Input field */
  .input-glass {
    @apply w-full px-4 py-3 rounded-2xl font-mono text-text-primary
           bg-bg-input border border-border-subtle outline-none
           transition-all duration-200 placeholder:text-text-muted;
  }
  .input-glass:focus {
    @apply border-primary-500;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  .input-glass.error {
    @apply border-danger-500;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
  }

  /* Skeleton loading shimmer */
  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.03) 0%,
      rgba(255,255,255,0.07) 50%,
      rgba(255,255,255,0.03) 100%
    );
    background-size: 1000px 100%;
    animation: shimmer 1.8s ease-in-out infinite;
    border-radius: 12px;
  }

  /* Status badges */
  .badge { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium; }
  .badge-success { @apply badge text-success-400; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.20); }
  .badge-danger  { @apply badge text-danger-400;  background: rgba(239,68,68,0.12);  border: 1px solid rgba(239,68,68,0.20);  }
  .badge-warning { @apply badge text-warning-400; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.20); }
  .badge-neutral { @apply badge text-text-secondary; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); }
  .badge-primary { @apply badge text-primary-400; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.20); }
}

/* Animated background orbs — add div.bg-orbs as first child of body */
.bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.bg-orb  { position: absolute; border-radius: 50%; filter: blur(80px); }
.bg-orb-1 { width: 600px; height: 600px; background: var(--orb-1); top: -200px; left: -100px; animation: orb1 25s ease-in-out infinite; }
.bg-orb-2 { width: 500px; height: 500px; background: var(--orb-2); bottom: -150px; right: -100px; animation: orb2 30s ease-in-out infinite; }
.bg-orb-3 { width: 400px; height: 400px; background: var(--orb-3); top: 40%; left: 40%; transform: translate(-50%,-50%); animation: orb3 20s ease-in-out infinite; }

/* Chart overrides */
.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line { stroke: rgba(255,255,255,0.04) !important; }

/* Respect user's reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .bg-orb { animation: none !important; }
}
```

---

## 10. SHARED COMPONENTS LIBRARY

### GlassCard.tsx
```tsx
// GlassCard wraps any content in a glass-effect card
// variant controls which glass style is applied
// hoverable makes the card lift slightly when hovered

import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

type GlassVariant = 'default' | 'elevated' | 'accent' | 'success' | 'danger';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: GlassVariant;
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClass: Record<GlassVariant, string> = {
  default:  'glass',
  elevated: 'glass-elevated',
  accent:   'glass-accent',
  success:  'bg-success-soft border border-success/20',
  danger:   'bg-danger-soft border border-danger-500/20',
};

export function GlassCard({ variant = 'default', hoverable, className, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2, boxShadow: '0 12px 48px rgba(0,0,0,0.5)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={clsx(variantClass[variant], 'p-6', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### GlowButton.tsx
```tsx
// Primary action button with neon glow effect
// Use this for Send Money, Confirm, and all main CTAs
// loading prop shows spinner and disables the button

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary-500 shadow-glow-primary',
  success: 'bg-success-500 shadow-glow-success',
  danger:  'bg-danger-500 shadow-glow-danger',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export function GlowButton({
  children, onClick, loading, disabled, type = 'button',
  variant = 'primary', size = 'md', fullWidth, className,
}: GlowButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={clsx(
        'btn-primary font-semibold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Processing...
        </span>
      ) : children}
    </motion.button>
  );
}
```

### AmountDisplay.tsx
```tsx
// Always use this component to show money amounts
// It converts paise to rupees and formats properly
// Never show raw paise numbers to users

import { useCountUp } from '@/hooks/useCountUp';
import { clsx } from 'clsx';

interface AmountDisplayProps {
  paise: number;           // Money in paise — this is always the input
  animate?: boolean;       // If true, number counts up from 0 on mount
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'balance';
  positive?: boolean;      // Show in green
  negative?: boolean;      // Show in red
  showSign?: boolean;      // Show + or - prefix
}

const sizeClasses = {
  sm:      'text-sm font-mono',
  md:      'text-base font-mono font-medium',
  lg:      'text-xl font-mono font-semibold',
  xl:      'text-amount font-display font-bold tracking-tight',
  balance: 'text-balance font-display font-bold tracking-tight',
};

export function AmountDisplay({ paise, animate, size = 'md', positive, negative, showSign }: AmountDisplayProps) {
  // useCountUp returns 0 initially and counts to target over 1000ms
  const animatedPaise = useCountUp(paise, animate ? 1000 : 0);
  const displayPaise = animate ? animatedPaise : paise;

  // Always divide by 100 — store in paise, display in rupees
  const rupees = displayPaise / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={clsx(
      sizeClasses[size],
      positive && 'text-success-400',
      negative && 'text-danger-400',
      !positive && !negative && 'text-text-primary',
    )}>
      {showSign && (positive ? '+' : negative ? '-' : '')}
      <span className="text-text-secondary opacity-70 mr-0.5">₹</span>
      {formatted}
    </span>
  );
}
```

### Skeleton.tsx
```tsx
// Shows a shimmering placeholder while data is loading
// Always show skeletons — never show blank screens while fetching

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  const r = { sm: 'rounded', md: 'rounded-xl', lg: 'rounded-2xl', full: 'rounded-full' };
  return <div className={clsx('skeleton', r[rounded], className)} />;
}

// Ready-made skeleton for stat cards
export function StatCardSkeleton() {
  return (
    <div className="glass p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Ready-made skeleton for transaction rows
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border-subtle">
      <Skeleton className="w-10 h-10" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
```

---

## 11. PAGE 1 — DASHBOARD

### Visual Blueprint
```
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR  │  Good morning, Arjun 👋           [⚡ Send Money] │
│          │ ─────────────────────────────────────────────────  │
│  🏠 Home │  ┌───────────────────────┐  ┌───────┐  ┌───────┐ │
│  💸 Send │  │  Total Balance        │  │ SENT  │  │ RCVD  │ │
│  📋 Txns │  │  ₹24,500.00  (counts) │  │₹3,200 │  │₹1,800 │ │
│  🛡 Admin│  │  ↑ +12% this week     │  │ today │  │ today │ │
│          │  │  [floating animation] │  │       │  │       │ │
│          │  └───────────────────────┘  └───────┘  └───────┘ │
│          │  ┌──────────────────────────────────────────────┐ │
│          │  │  Volume — Last 7 Days                        │ │
│          │  │  ━━ Sent  ━━ Received  (glowing area chart)  │ │
│          │  └──────────────────────────────────────────────┘ │
│          │  ┌──────────────────────────────────────────────┐ │
│          │  │  Recent Activity                  [View All] │ │
│          │  │  ● Rahul Kumar  Sent   -₹500  2 min  ✅      │ │
│          │  │  ● Priya Singh  Rcvd  +₹2000  1 hr   ✅      │ │
│          │  │  ● Kunal Mehta  Sent   -₹250  Yest   ✅      │ │
│          │  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Copilot Prompt for Dashboard
```
Build DashboardPage.tsx following SETTLR_UI_COPILOT.md Section 11.

BALANCE CARD (glass-elevated variant, full width on mobile):
  - Large balance with useCountUp animation — number counts from 0 on mount
  - Label "Total Balance" in text-text-secondary above the number
  - Small success badge "+12% this week" below the number
  - Subtle float animation on the card (animate-float class)
  - "⚡ Send Money" GlowButton top right, navigates to /send on click

3 STAT CARDS (glass variant, appear with stagger animation):
  Stat 1: Total Sent Today — red accent, ArrowUpRight icon (Lucide)
  Stat 2: Total Received — green accent, ArrowDownLeft icon (Lucide)
  Stat 3: Success Rate — show as percentage, CheckCircle icon (Lucide)
  All three stat numbers use useCountUp
  Cards use staggerContainer + staggerItem from animations.ts

VOLUME CHART (VolumeChart component, 240px tall):
  - Two area lines: Sent (red) and Received (green)
  - Gradient fill: each line fades to transparent below it
  - Custom dark tooltip with glass styling (override recharts default)
  - X axis: Mon Tue Wed Thu Fri Sat Sun
  - Y axis: hidden
  - Grid: horizontal only, rgba(255,255,255,0.04)
  - Animate on mount: isAnimationActive=true, animationDuration=1200

RECENT ACTIVITY LIST (last 5 transactions):
  - Title "Recent Activity" + "View All" link to /transactions
  - Stagger animation: each row appears 50ms after previous
  - Each row contains:
      Avatar circle with initials (e.g., "RK" for Rahul Kumar)
      Name on top + "Sent to" or "Received from" below in muted
      Amount: red with minus (sent) or green with plus (received)
      Time: use formatDistanceToNow from date-fns
      Green dot for completed
  - Row hover: background rgba(255,255,255,0.03), translateY(-1px)
  - Empty state when list is empty: icon + "No transactions yet"

Use mock data arrays for everything.
Add plain English comment above every component.
```

---

## 12. PAGE 2 — SEND MONEY

### Three-Step Flow Blueprint
```
STEP 1 — WHO              STEP 2 — AMOUNT            STEP 3 — CONFIRM
┌────────────────┐         ┌────────────────┐         ┌────────────────┐
│ ① ──── ② ──── ③│         │ ① ──── ② ──── ③│         │ ① ──── ② ──── ③│
│                │  →      │                │  →      │                │
│ Send to whom?  │ Slide   │ How much?      │ Slide   │ Confirm        │
│                │         │                │         │                │
│ 🔍 [Search...] │         │ Balance:₹24.5k │         │ To: Rahul Kumar│
│                │         │                │         │ Amount: ₹500   │
│ ● Rahul Kumar  │         │ ₹ [  500  ]    │         │ TXN: abc-123   │
│   rahul@e.com  │         │                │         │                │
│   [Select ✓]  │         │ Description:   │         │ [Cancel][SEND] │
│                │         │ [Optional...]  │         │                │
│ [  Next →  ]   │         │                │         │ → PROCESSING   │
│                │         │ You send ₹500  │         │ → SUCCESS ✅   │
│                │         │ Rahul gets ₹500│         │ → ERROR ❌     │
│                │         │ [  Next →  ]   │         │                │
└────────────────┘         └────────────────┘         └────────────────┘
```

### Copilot Prompt for Send Money
```
Build SendMoneyPage.tsx following SETTLR_UI_COPILOT.md Section 12.

PROGRESS BAR AT TOP:
  Three steps shown as circles with connecting lines
  Active step: indigo filled circle, slightly larger (scale 1.1)
  Completed: indigo with checkmark
  Upcoming: grey outline
  Use Framer Motion layoutId on the active indicator so it slides smoothly

STEP 1 — RECIPIENT SEARCH:
  Search input with magnifying glass icon inside (Lucide Search)
  On typing: filter mock user list by name or email in real time
  Results appear with AnimatePresence — each slides in from below
  Each result card: Avatar + name + email + "Select" button
  On select: card gets green border + checkmark icon replaces Select
  Next button: only active when a recipient is selected
  Disabled Next: opacity-50, no glow, cursor-not-allowed

STEP 2 — AMOUNT:
  Show sender balance above input: "Your balance: ₹24,500.00"
  Large centered input: ₹ prefix on left, font-mono, large text
  Validation rules:
    - Must be positive integer (paise)
    - Cannot exceed sender balance
    - If exceeds: input border → red, shake animation, show error text
  Optional description field below amount
  Live preview card: "You send ₹500.00 → Rahul Kumar receives ₹500.00"
  Next button only active when amount is valid

STEP 3 — CONFIRM:
  Summary glass card: recipient avatar, name, amount, description
  Auto-generate UUID idempotency key when Step 3 mounts
  Show as "Transaction ID: abc-123-def..." with copy button
  Info tooltip on the ID: "This unique ID means you can never be charged twice"
  Two buttons: Cancel (ghost, goes back) and "Send ₹500.00" (primary glow)
  
  ON SUBMIT:
    Button shows spinner + "Processing..."
    After 1.5s mock delay:
    SUCCESS → Full page SuccessScreen component with:
      Animated SVG checkmark drawing itself (pathLength 0→1)
      "₹500.00 sent to Rahul Kumar!"
      Transaction ID shown
      "Send Another" button
    ERROR → ErrorScreen with red X + error message + "Try Again" button

STEP TRANSITIONS:
  Use AnimatePresence with mode="wait"
  Going forward: new step slides in from right (x:40→0)
  Going back: new step slides in from left (x:-40→0)
  Duration: 300ms spring animation

Explain every animation in plain English comments.
Use mock data. I will connect real API later.
```

---

## 13. PAGE 3 — TRANSACTION HISTORY

### Layout Blueprint
```
┌──────────────────────────────────────────────────────────────┐
│ Transaction History                        [↓ Export CSV]    │
│ ─────────────────────────────────────────────────────────── │
│ [All]  [Sent]  [Received]  [Failed]   🔍 [Search...]        │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ ┌────────────────────────────┐  ┌────────────────────────┐  │
│ │ ↑  Rahul Kumar   -₹500    │  │ TRANSACTION DETAIL     │  │
│ │    Sent · 2 min ago  ✅   │  │ ──────────────────────  │  │
│ ├────────────────────────────┤  │ TXN-abc123...  [copy]  │  │
│ │ ↓  Priya Singh  +₹2,000   │  │ ₹500.00 · Completed    │  │
│ │    Received · 1hr   ✅    │  │                         │  │
│ ├────────────────────────────┤  │ LEDGER TRAIL           │  │
│ │ ↑  Kunal Mehta  -₹250     │  │ ─────────────          │  │
│ │    Sent · Yesterday  ✅   │  │ Your Acct   Debit -₹500 │  │
│ ├────────────────────────────┤  │ Bal: ₹24.5k → ₹24k    │  │
│ │ ↑  Netflix      -₹649     │  │ ─────────────          │  │
│ │    Sent · 3 days    ✅    │  │ Rahul Acct Credit +₹500 │  │
│ └────────────────────────────┘  │ Bal: ₹1.2k → ₹1.7k    │  │
│                                  │                         │  │
│ [Load more]                      │ FRAUD ANALYSIS          │  │
│                                  │ Score: 12/100           │  │
│                                  │ ████████░░ (animated)   │  │
│                                  │ ✅ Frequency    — Pass  │  │
│                                  │ ✅ Unusual Amt  — Pass  │  │
│                                  │ ✅ Time of Day  — Pass  │  │
│                                  │ ✅ Account Age  — Pass  │  │
│                                  │ ✅ Round Number — Pass  │  │
│                                  │ ✅ Recipient    — Pass  │  │
│                                  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Copilot Prompt for Transaction History
```
Build TransactionHistoryPage.tsx following SETTLR_UI_COPILOT.md Section 13.

FILTER TABS:
  Four tabs: All / Sent / Received / Failed
  Active tab: underline indicator that slides using Framer Motion layoutId
  Clicking a tab filters the list instantly
  List re-renders with stagger animation when filter changes

SEARCH:
  Input with Search icon (Lucide)
  Filters by recipient name or amount as user types
  Debounce 300ms so it does not filter on every keystroke

TRANSACTION LIST:
  Each row is TransactionRow component:
    Left icon: ArrowUpRight in danger-soft bg (sent) or
               ArrowDownLeft in success-soft bg (received)
    Avatar with initials in colored circle
    Name (bold) + "Sent to" or "Received from" (muted, smaller)
    Amount: AmountDisplay with negative+showSign (sent) or positive+showSign (received)
    Time: formatDistanceToNow from date-fns ("2 mins ago")
    Status badge: badge-success / badge-danger / badge-warning
  Rows stagger in with 50ms delay
  Row hover: bg rgba(255,255,255,0.03), y:-1px transition 150ms
  Click anywhere on row: opens detail panel

DETAIL SIDE PANEL (TransactionDetail component):
  Slides in from right: AnimatePresence + x:100% to x:0 spring animation
  Fixed position on right side, full height, width 480px desktop
  Overlay (dark semi-transparent) appears behind it on mobile, click to close
  
  HEADER:
    Transaction ID in font-mono text-xs + copy button
    Copy icon → check icon → back to copy (with AnimatePresence swap)
    Amount large + Status badge
    Close × button top right

  LEDGER TRAIL SECTION:
    Title "Ledger Trail" with info tooltip: "Shows exact balance changes"
    Two entry cards:
      Card 1 — Debit: "Your Account" | -₹500.00 | ₹24,500 → ₹24,000
      Arrow pointing right between cards
      Card 2 — Credit: "Rahul's Account" | +₹500.00 | ₹1,200 → ₹1,700
    Both use font-mono for numbers
    Subtle arrow/chevron showing direction of money flow

  FRAUD ANALYSIS SECTION:
    Title "Risk Analysis"
    Score: large number + color based on score
      0-29: success green
      30-59: warning yellow
      60-79: warning orange
      80+: danger red
    Horizontal progress bar: animates from 0 to score on panel open
    List of all 6 signals in plain English (NOT code names):
      VELOCITY_CHECK    → "Transaction Frequency"
      AMOUNT_ANOMALY    → "Unusual Amount"
      UNUSUAL_HOUR      → "Time of Transfer"
      NEW_ACCOUNT       → "Account Age"
      ROUND_AMOUNT      → "Round Number Detection"
      RECIPIENT_RISK    → "Recipient Activity"
    Each shows ✅ Pass or ⚠️ Flagged +X pts

EMPTY STATE:
  When list is empty (filtered or no transactions):
  Icon + "No transactions found" + "Clear filters" button

Use mock data. Explain everything in plain English comments.
```

---

## 14. PAGE 4 — ADMIN FRAUD PANEL

### Layout Blueprint
```
┌──────────────────────────────────────────────────────────────┐
│ 🛡 Fraud Intelligence                ● Live · 2 seconds ago  │
│ ─────────────────────────────────────────────────────────── │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │  2,847   │ │    91    │ │  18.4    │ │  99.7%   │        │
│ │ Txns/day │ │ Blocked  │ │Avg Score │ │ Success  │        │
│ │ ↑ +12%   │ │  3.2%    │ │ Low Risk │ │  Rate    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ ┌──────────────────────────────┐ ┌──────────────────────┐   │
│ │ 🚨 FLAGGED TRANSACTIONS      │ │ SIGNAL BREAKDOWN      │   │
│ │ Fraud score > 30             │ │                       │   │
│ │ ─────────────────────        │ │ Frequency   ████░ 42  │   │
│ │ User  Amt    Score  Action   │ │ Unusual Amt ███░░ 28  │   │
│ │ Rahul ₹50k  75 ███ DECLINE  │ │ Time        ██░░░ 15  │   │
│ │ Priya ₹10k  45 ██░ REVIEW   │ │ New Acct    █░░░░  8  │   │
│ │ Kunal  ₹5k  35 █░░ REVIEW   │ │ Round Amt   █░░░░  6  │   │
│ │                              │ │ Recipient   ░░░░░  2  │   │
│ │ [Load more]                  │ └──────────────────────┘   │
│ └──────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

### Copilot Prompt for Admin Fraud Panel
```
Build FraudPanelPage.tsx following SETTLR_UI_COPILOT.md Section 14.

Route: /admin/fraud — This page is for admin only, not customers.

LIVE INDICATOR (top right):
  Green pulsing dot + "Live · Xs ago" text
  Counter increments every second showing age of data
  Pulses with pulseGlow animation

TOP METRIC CARDS (4 cards, stagger in):
  Card 1: Transactions Today
    Large number with useCountUp
    Subtitle "transactions processed"
    Trend: small arrow + percentage vs yesterday

  Card 2: Fraud Blocked
    Number of blocked transactions
    Percentage of total in muted text below
    Danger red accent color

  Card 3: Average Fraud Score
    Number (e.g., 18.4)
    Color-coded label below:
      Under 20: "Low Risk" in green
      20-50: "Medium Risk" in yellow
      Over 50: "High Risk" in red

  Card 4: Success Rate
    Percentage (e.g., 99.7%)
    Green accent if above 99%

FLAGGED TRANSACTIONS TABLE:
  Glass card wrapper, no traditional HTML table borders
  Show only transactions where fraud_score > 30
  Row separator: 1px border-border-subtle
  Columns for each flagged transaction:
    User: Avatar with initials + name
    Amount: AmountDisplay in font-mono
    Score: number + mini horizontal bar colored by range
      30-59: yellow bar
      60-79: orange bar
      80+: red bar
    Signals: badges showing which rules fired
      e.g., "Frequency +25" badge-warning
           "Amount +30" badge-danger
    Action: badge showing fraud engine decision
      approve: badge-success
      review: badge-warning
      decline: badge-danger
    Time: time ago string
  Rows stagger in
  Hover: row highlights
  Empty state: "No flagged transactions today 🎉" in success color

SIGNAL BREAKDOWN CHART (FraudBarChart, Recharts):
  Horizontal BarChart (layout="vertical")
  Y axis: 6 rule names in plain English
  X axis: count, hidden labels, subtle grid
  Bar: gradient fill indigo-to-violet
  Bar animates from 0 to value on mount
  Value label at end of each bar
  Glass card wrapper

Use mock data. Add comments explaining what admin use cases this serves.
```

---

## 15. LAYOUT + NAVIGATION

### Sidebar Component Spec

```
Width: 240px fixed on desktop
Mobile: hidden by default, hamburger menu opens it as overlay

TOP:
  Logo: Lightning bolt icon (Lucide Zap) + "SETTLR" text
  Both in indigo-500 color with subtle glow

NAVIGATION LINKS:
  Home (LayoutDashboard icon) → /dashboard
  Send Money (Send icon) → /send
  Transactions (Receipt icon) → /transactions
  ─── divider ───
  Fraud Panel (Shield icon) → /admin/fraud  [Admin only]

ACTIVE STATE:
  Active item: indigo background rgba(99,102,241,0.10)
  Left border: 3px indigo-500
  Text: white instead of text-secondary
  Use Framer Motion layoutId on the active indicator background
  so it slides smoothly between nav items when you click

HOVER:
  Background: rgba(255,255,255,0.04)
  Text: text-text-primary
  Duration: 150ms

BOTTOM SECTION:
  User avatar + name + email
  Logout button (LogOut icon) — clears auth state and goes to /login

SIDEBAR BACKGROUND:
  rgba(13,13,20,0.90) — slightly lighter than page
  Right border: border-border-subtle
  backdrop-filter: blur(20px)
```

### App.tsx Routes Setup
```tsx
// App.tsx — Route configuration
// Wrap all routes with AnimatePresence for page transitions

import { AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation } from 'react-router-dom';

// In App.tsx render:
const location = useLocation();

<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/send" element={<SendMoneyPage />} />
      <Route path="/transactions" element={<TransactionHistoryPage />} />
      <Route path="/admin/fraud" element={<FraudPanelPage />} />
    </Route>
    <Route path="/" element={<Navigate to="/dashboard" />} />
  </Routes>
</AnimatePresence>
```

---

## 16. MICRO-INTERACTIONS CATALOG

Every interaction must give the user feedback. Build all of these:

### Copy to Clipboard
```
State 1 (default): Copy icon (Lucide Copy)
On click: icon swaps to Check icon with fade animation
After 2 seconds: swaps back to Copy icon
Use AnimatePresence with key prop to trigger re-animation
Show brief "Copied!" tooltip that fades out
```

### Filter Tab Switch
```
Active underline: Framer Motion div with layoutId="tab-indicator"
Slides horizontally between tabs on click
Transaction list fades out then new items stagger in
Duration: 200ms for tab, 50ms stagger for list items
```

### Amount Input Validation
```
Default: border-border-subtle
Focused: border-primary-500, glow ring rgba(99,102,241,0.15)
Valid:   border-success-500
Invalid: border-danger-500, shake animation
         (keyframe: x: 0 → 8 → -8 → 6 → -6 → 4 → -4 → 0, duration 400ms)
```

### Send Button States
```
Idle:     Indigo with static glow
Hover:    Scale 1.02, glow intensifies
Tap:      Scale 0.97
Loading:  Spinner + "Processing...", glow pulses slowly
Success:  Scale up, turns green, then transitions to success screen
Error:    Brief red, shake, returns to idle
```

### Transaction Row Hover
```
On mouseenter: background from transparent → rgba(255,255,255,0.03)
               translateY: 0 → -1px
Duration: 150ms cubic-bezier(0.25, 0.1, 0.25, 1)
Cursor: pointer
```

### Detail Panel Backdrop
```
When panel opens: dark overlay fades in behind it (opacity 0 → 0.5)
When panel closes: overlay fades out
Click overlay: closes panel
On mobile: panel takes full width, overlay always shown
```

### Fraud Score Bar Animation
```
On TransactionDetail panel open:
  Progress bar starts at width 0
  Animates to score% width over 800ms
  Color: green/yellow/orange/red based on final value
  Score number uses useCountUp alongside the bar
  Delay: 200ms after panel finishes sliding in
```

### Balance Update After Send
```
After successful payment:
  Old balance fades to 60% opacity
  New balance counts from old value to new value over 600ms
  Brief green flash on the number (background green → transparent)
```

---

## 17. WHAT COPILOT MUST NEVER DO

### Design Violations
- NEVER use white or light backgrounds — always dark
- NEVER use flat solid color cards — always glass effect
- NEVER skip backdrop-filter blur on glass elements
- NEVER use bright white text — use text-text-primary (#f1f5f9)
- NEVER put all text in pure white — body text should be text-text-secondary
- NEVER use more than 3 colors in a single component
- NEVER add drop shadows without blur — always box-shadow with blur

### Money Display Violations
- NEVER show raw paise numbers to users — always use AmountDisplay component
- NEVER use .toFixed(2) alone — use toLocaleString('en-IN')
- NEVER forget the ₹ symbol
- NEVER show negative numbers for debits without context

### Animation Violations
- NEVER use CSS transitions on layout properties (width/height/top/left)
- NEVER use setTimeout for animations — use Framer Motion
- NEVER animate more than 3 elements simultaneously
- NEVER use animation durations over 500ms for micro-interactions
- NEVER skip AnimatePresence when components mount/unmount
- NEVER use transform without also handling will-change or GPU acceleration

### Code Quality Violations
- NEVER use any TypeScript type — find the real type
- NEVER use default exports — always named exports
- NEVER use console.log — remove all debugging before finishing
- NEVER put logic directly in page components — use hooks and services
- NEVER use inline styles except for dynamic values (e.g., strokeDashoffset)
- NEVER skip loading states — every data fetch needs a skeleton
- NEVER skip error states — every fetch needs an error UI
- NEVER add webhook pages or components for customer-facing views

### Common Copilot Mistakes to Fix

| Copilot Does This | Do This Instead |
|-------------------|-----------------|
| `className="bg-gray-900 rounded-lg"` | `className="glass p-6"` |
| `useState` for server data | `useQuery` from TanStack Query |
| `transaction.amount` directly | `<AmountDisplay paise={transaction.amount} />` |
| Inline animation: `style={{ transition: 'all 0.3s' }}` | Framer Motion motion.div with variants |
| `<button className="bg-blue-500 px-4 py-2">` | `<GlowButton>` component |
| Skip loading: render data immediately | Show `<StatCardSkeleton />` while loading |
| `new Date(date).toLocaleDateString()` | `formatDistanceToNow(new Date(date))` from date-fns |
| Direct DOM: `document.getElementById` | React ref + Framer Motion |
| `Math.random()` for list keys | Use actual transaction ID as key |
| Table element for layout | CSS grid with glass dividers |

---

## 18. EXACT COPILOT PROMPTS

### Full Project Setup — Use This First
```
Read both attached files completely.
File 1: SETTLR_COPILOT.md — backend rules
File 2: SETTLR_UI_COPILOT.md — frontend UI rules

Set up the complete Settlr React frontend project:

1. Create Vite + React + TypeScript project structure
2. Install all packages from SETTLR_UI_COPILOT.md Section 7
3. Create tailwind.config.ts exactly from Section 8
4. Create src/index.css exactly from Section 9
5. Create the full folder structure from Section 6
6. Create src/animations/variants.ts with all variants from Section 5
7. Create src/hooks/useCountUp.ts from Section 5
8. Create src/lib/formatters.ts with:
   - formatCurrency(paise): converts paise to "₹99.50" string
   - timeAgo(date): returns "2 minutes ago" using date-fns
9. Create App.tsx with all routes from Section 15
10. Create AppLayout.tsx with:
    - Animated background orbs (bg-orbs div)
    - Sidebar navigation component
    - Main content area
11. Create all shared UI components from Section 10:
    GlassCard, GlowButton, Badge, AmountDisplay, Skeleton

After creating each file, explain what it does in 2 simple sentences.
I am learning React — keep explanations friendly and clear.
Do NOT start building pages until I say "ready for pages".
```

### Per-Page Prompts
```
// Dashboard
Read SETTLR_UI_COPILOT.md Section 11 fully.
Build DashboardPage.tsx and all its sub-components.
Use mock data. Follow every layout and animation detail exactly.
Explain every animation with a plain English comment.

// Send Money
Read SETTLR_UI_COPILOT.md Section 12 fully.
Build SendMoneyPage.tsx with all 3 steps and all transition animations.
Include the SVG checkmark draw animation on the success screen.
Explain the idempotency key in a comment.

// Transaction History
Read SETTLR_UI_COPILOT.md Section 13 fully.
Build TransactionHistoryPage.tsx with the slide-in detail panel.
Show fraud signals with plain English labels, not code names.
Explain the ledger trail in a comment.

// Admin Fraud Panel
Read SETTLR_UI_COPILOT.md Section 14 fully.
Build FraudPanelPage.tsx with metric cards, flagged table, bar chart.
Add a comment explaining this is admin-only and not shown to customers.
```

### Connecting Real API
```
Read both attached files.

Replace all mock data with real API calls:

1. Create src/api/axios.ts:
   - Base URL from import.meta.env.VITE_API_URL
   - Request interceptor: add Authorization Bearer token from Zustand store
   - Request interceptor: add X-Trace-Id header (crypto.randomUUID())
   - Response interceptor: if 401 → clear store → navigate to /login

2. Create TanStack Query hooks:
   - useAccount(): GET /api/v1/accounts — staleTime 30 seconds
   - useTransactions(filters): GET /api/v1/accounts/:id/transactions
   - useSendMoney(): useMutation for POST /api/v1/payments
   - useFraudStats(): GET /api/v1/admin/fraud/stats (admin only)

3. Replace every mock data import with real query hooks
4. Skeleton components show while isLoading is true
5. Error message component shows when isError is true

Add a comment above each hook explaining what it fetches and why.
```

---

## QUICK REFERENCE CARD

```
Glass card:       .glass class or <GlassCard> component
Elevated card:    .glass-elevated class or <GlassCard variant="elevated">
Money display:    <AmountDisplay paise={amount} /> — NEVER raw numbers
Button:           <GlowButton> primary | .btn-ghost secondary
Status:           <Badge variant="success|danger|warning|neutral">
Loading:          <Skeleton> or <StatCardSkeleton> or <TransactionRowSkeleton>
Animations:       Import from src/animations/variants.ts — never custom
Number countUp:   useCountUp(targetNumber, durationMs) hook
Page transition:  <PageWrapper> wrapping each page content
List stagger:     staggerContainer on parent + staggerItem on each child
Icons:            lucide-react only
Charts:           recharts only — never canvas API
Fonts:            Inter for text, JetBrains Mono for numbers and IDs
Colors:           primary-500 (#6366f1), success-500 (#10b981), danger-500 (#ef4444)
Background:       Always #050508 + animated orbs behind everything
Time display:     formatDistanceToNow(date) from date-fns — always
```

---

*Single source of truth for all Settlr frontend decisions.*
*When in doubt: glass cards, indigo glow, spring animations, monospace numbers, paise in — rupees out.*
