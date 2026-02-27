// Settlr Glassmorphism Design System — Premium Dark Mode
// Style: Glassmorphism + Neon Glow | Animations: Framer Motion
// Primary: Indigo (#6366f1) | Success: Emerald (#10b981)
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BACKGROUNDS
        bg: {
          primary: '#050508',   // Alias for base — used in LoginPage, RegisterPage
          base:    '#050508',   // Page background — near black with blue tint
          secondary:'#0d0d14',  // Cards, inputs on auth pages
          surface: '#0d0d14',   // Sidebar background
          card:    '#11111c',   // Card base before glass effect
          elevated:'#16162a',   // Elevated elements (dropdowns, hovers)
          hover:   '#16162a',   // Card on hover
          input:   '#0a0a15',   // Input fields
          tertiary:'#1a1a2e',   // Tertiary background
        },
        // BORDERS
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',    // Default border
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
          light: '#a5b4fc',  // Light variant for hover states
          dark:  '#4f46e5',  // Dark variant for active states
          glow: 'rgba(99,102,241,0.40)',
          soft: 'rgba(99,102,241,0.10)',
        },
        // SUCCESS — Emerald
        success: {
          DEFAULT: '#10b981',
          400: '#34d399',
          500: '#10b981',   // MAIN SUCCESS
          600: '#059669',
          bg:    'rgba(16,185,129,0.10)',  // Background for success badges
          light: '#6ee7b7',  // Light variant for amounts
          text:  '#34d399',  // Text color for amounts
          glow: 'rgba(16,185,129,0.40)',
          soft: 'rgba(16,185,129,0.10)',
        },
        // DANGER — Red
        danger: {
          DEFAULT: '#ef4444',
          400: '#f87171',
          500: '#ef4444',   // MAIN DANGER
          600: '#dc2626',
          bg:    'rgba(239,68,68,0.10)',   // Error message bg
          light: '#fca5a5',  // Light variant for amounts
          text:  '#f87171',  // Text color for amounts
          glow: 'rgba(239,68,68,0.40)',
          soft: 'rgba(239,68,68,0.10)',
        },
        // WARNING — Amber
        warning: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',   // MAIN WARNING
          600: '#d97706',
          bg:   'rgba(245,158,11,0.10)',  // Background for warning badges
          text: '#fbbf24',  // Text for warning states
          glow: 'rgba(245,158,11,0.40)',
          soft: 'rgba(245,158,11,0.10)',
        },
        // BRAND — Gold/Amber accent (auth pages, links)
        brand: {
          DEFAULT: '#f59e0b',
          hover:   '#d97706',
          light:   '#fbbf24',
        },
        // CTA — Purple call-to-action buttons
        cta: {
          DEFAULT: '#8b5cf6',
          hover:   '#7c3aed',
          active:  '#6d28d9',
        },
        // TEXT
        text: {
          primary:   '#f1f5f9',   // Main content
          secondary: '#94a3b8',   // Supporting text
          tertiary:  '#64748b',   // Tertiary text (filter labels, hints)
          muted:     '#475569',   // Placeholder, disabled
          ghost:     '#334155',   // Very subtle
        },
        // CHART
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
        'purple-glow':  '0 0 20px rgba(139,92,246,0.35), 0 0 60px rgba(139,92,246,0.10)',
        'gold-glow':    '0 0 20px rgba(245,158,11,0.35), 0 0 60px rgba(245,158,11,0.10)',
        'input':        '0 0 0 3px rgba(99,102,241,0.15)',
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
