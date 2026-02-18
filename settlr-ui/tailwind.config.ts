// Settlr Design System v2.0 — Fintech Dark Mode OLED Theme
// Design: Conversion-Optimized | Style: Dark Mode (OLED) | WCAG AAA
// Gold trust (#F59E0B) + Purple tech (#8B5CF6)
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design System Color Palette
        // Background: Deep black OLED
        bg: {
          primary:   '#0F172A',      // Deep black for main content
          secondary: '#1E293B',      // Slightly lighter for cards
          tertiary:  '#334155',      // Hover states, interactive elements
          border:    '#475569',      // Dividers, borders
        },
        // Brand colors — Gold trust primary, Purple tech CTA
        brand: {
          DEFAULT:   '#F59E0B',      // Gold primary — trust, financial
          hover:     '#D97706',      // Darker gold on hover
          active:    '#B45309',      // Even darker on active
          light:     '#FBBF24',      // Light gold secondary
          muted:     '#FCD34D',      // Muted gold
        },
        // CTA: Purple tech
        cta: {
          DEFAULT:   '#8B5CF6',      // Purple CTA — tech, modern
          hover:     '#7C3AED',      // Darker purple on hover
          active:    '#6D28D9',      // Even darker on active
          light:     '#A78BFA',      // Light purple
          muted:     '#C4B5FD',      // Muted purple
        },
        // Text colors — light on dark
        text: {
          primary:   '#F8FAFC',      // Off-white for main text
          secondary: '#CBD5E1',      // Medium gray for labels
          muted:     '#94A3B8',      // Light gray for hints
        },
        // Status colors
        success: {
          DEFAULT:   '#10B981',      // Emerald for success
          bg:        '#064E3B',      // Dark emerald background
          text:      '#D1FAE5',      // Light emerald text
          border:    '#10B981',
        },
        danger: {
          DEFAULT:   '#EF4444',      // Red for errors, fraud
          bg:        '#7F1D1D',      // Dark red background
          text:      '#FECACA',      // Light red text
          border:    '#EF4444',
        },
        warning: {
          DEFAULT:   '#F59E0B',      // Gold for warnings
          bg:        '#78350F',      // Dark amber background
          text:      '#FCD34D',      // Light amber text
          border:    '#F59E0B',
        },
        info: {
          DEFAULT:   '#3B82F6',      // Blue for info
          bg:        '#1E3A8A',      // Dark blue background
          text:      '#BFDBFE',      // Light blue text
          border:    '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Design system typography scale
        xs:    ['12px', { lineHeight: '16px', letterSpacing: '0px' }],
        sm:    ['14px', { lineHeight: '20px', letterSpacing: '0px' }],
        base:  ['16px', { lineHeight: '24px', letterSpacing: '0px' }],
        lg:    ['18px', { lineHeight: '28px', letterSpacing: '0px' }],
        xl:    ['20px', { lineHeight: '28px', letterSpacing: '0px' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '0px' }],
        '3xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card:  '8px',
        input: '6px',
        badge: '4px',
        btn:   '6px',
      },
      boxShadow: {
        // Dark mode shadows for OLED theme
        sm:    '0 1px 2px rgba(0,0,0,0.3)',
        card:  '0 4px 6px rgba(0,0,0,0.2)',
        md:    '0 4px 6px rgba(0,0,0,0.1)',
        lg:    '0 10px 15px rgba(0,0,0,0.2)',
        xl:    '0 20px 25px rgba(0,0,0,0.15)',
        // Glow effects for fintech
        'gold-glow':  '0 0 10px rgba(245, 158, 11, 0.2)',
        'purple-glow': '0 0 10px rgba(139, 92, 246, 0.2)',
        focus: '0 0 0 3px rgba(245, 158, 11, 0.1)',
      },
      spacing: {
        // 4px base unit per design system
        xs:   '4px',
        sm:   '8px',
        md:   '16px',
        lg:   '24px',
        xl:   '32px',
        '2xl': '48px',
      },
      transitionDuration: {
        fast:   '150ms',
        normal: '200ms',
        slow:   '300ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
