# Settlr Design System v1.0
## Fintech Transfer Platform - Modern Banking UI

---

## DESIGN PATTERN
**Hero-Centric Dashboard + Action-Driven Flows**
- Dashboard with balance & quick actions above fold
- Send money hero section with streamlined flow
- Transaction history with analytics
- Security & trust signals throughout

---

## STYLE: Modern Fintech Elegance
Keywords: Clean, trustworthy, modern, professional, subtle premium
Best For: Fintech, banking, payment platforms, wealth management
Performance: Excellent | Accessibility: WCAG AAA

---

## COLOR PALETTE
**Primary:**     `#6366F1` (Indigo)  — Trust, stability, action
**Secondary:**   `#10B981` (Emerald) — Success, growth, positive movement
**Accent:**      `#F59E0B` (Amber)   — Warnings, secondary actions
**Success:**     `#06B6D4` (Cyan)    — Completed transactions
**Danger:**      `#EF4444` (Red)     — Errors, fraud alerts
**Background:**  `#FFFFFF` (White)   — Light, clean, professional
**Surface:**     `#F9FAFB` (Soft Gray) — Card backgrounds, depth
**Text:**        `#1F2937` (Dark Gray) — Primary text
**Muted:**       `#6B7280` (Med Gray)  — Secondary text, labels
**Border:**      `#E5E7EB` (Light Gray) — Dividers, borders

---

## TYPOGRAPHY
**Font Stack:** `Inter`, `system-ui`, sans-serif
Mood: Clean, modern, approachable, professional
Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Sizes & Usage
- **Display (32px / 2rem):** Page titles, hero headlines
- **Heading1 (24px / 1.5rem):** Section headers
- **Heading2 (20px / 1.25rem):** Card titles, modals
- **Heading3 (18px / 1.125rem):** Subsection headers
- **Body (16px / 1rem):** Main content, descriptions
- **Small (14px / 0.875rem):** Labels, metadata, hints
- **Tiny (12px / 0.75rem):** Badges, timestamps

---

## SPACING & LAYOUT
**Base Unit:** 4px (Tailwind scale)
- **xs:** 4px / 0.25rem
- **sm:** 8px / 0.5rem
- **md:** 16px / 1rem
- **lg:** 24px / 1.5rem
- **xl:** 32px / 2rem
- **2xl:** 48px / 3rem

**Grid:** 12-column responsive (375px, 768px, 1024px, 1440px)

---

## COMPONENTS

### Buttons
- **Primary CTA:** Indigo bg, white text, 8px rounded, 200ms transition
  ```
  Hover: 10% darker indigo + lifted shadow
  Active: 15% darker indigo
  ```
- **Secondary:** Soft gray bg, dark text, white border
- **Disabled:** 50% opacity, cursor-not-allowed
- **Icon Buttons:** 40px minimum touch target

### Cards
- Soft shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Elevated shadow: `0 10px 25px rgba(0,0,0,0.08)`
- 8px border radius
- Padding: 16px

### Forms
- Input height: 40px
- Border: 1px light gray, focus: 2px indigo
- Placeholder: Medium gray
- Error: Red border + red helper text
- Label: Small bold, positioned above

### Modals
- Overlay: 50% dark gray
- Modal shadow: Elevated shadow + 8px radius
- Close button: Top-right corner
- Transition: 200ms ease-out

---

## KEY EFFECTS
- **Transitions:** 150-300ms cubic-bezier(0.4, 0, 0.2, 1)
- **Shadows:** Soft, subtle depth (no harsh grays)
- **Hover states:** Slight lift + color shift
- **Focus states:** Blue outline (3px) for keyboard nav
- **Animations:** Entrance at 300ms, exit at 150ms

---

## ANTI-PATTERNS TO AVOID
❌ Dark mode with bright cyan (causes eye strain)
❌ Neon colors or AI purple/pink gradients
❌ Harsh shadows or flat design without hierarchy
❌ Animations > 500ms (feels sluggish)
❌ Missing focus states (accessibility fail)
❌ Red as primary color (creates urgency)
❌ Very long lines of text (readability issue)
❌ Inconsistent spacing

---

## ACCESSIBILITY CHECKLIST
- [ ] Text contrast ≥ 4.5:1 (WCAG AA)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Icons with labels or aria-labels
- [ ] Form inputs clearly labeled
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No color alone conveys information
- [ ] Touch targets ≥ 40x40px
- [ ] Semantic HTML (buttons, links, headings)
- [ ] Proper heading hierarchy (h1 → h2 → h3)

---

## RESPONSIVE BREAKPOINTS
```
Mobile:   375px - 767px (full width, single column)
Tablet:   768px - 1023px (2-column layout)
Desktop:  1024px - 1439px (3-column layout)
Wide:     1440px+ (max-width containers)
```

---

## MICRO-INTERACTIONS
1. **CTA Button Hover:** Scale 1.02 + shadow lift
2. **Card Hover:** Shadow elevation + slight scale (1.01)
3. **Input Focus:** Border color change + background tint
4. **Alert Slide-in:** From top, 300ms ease-out
5. **Transaction Complete:** Green checkmark animation (400ms)
6. **Loading Skeleton:** Gentle pulse (1.5s loop)

---

## ICON SYSTEM
**Source:** Lucide React (`lucide-react`)
**Size Scale:** 
- Tiny: 16px (inline)
- Small: 20px (labels)
- Regular: 24px (buttons)
- Large: 32px (hero)

No emojis. Use SVG icons only.

---

## DARK MODE STRATEGY
Currently: **Light mode only** (fintech = stability = light theme)
Future: Implement if user testing shows demand (but avoid anti-patterns)

---

## DESIGN TOKENS (CSS Variables)
```css
--color-primary: #6366F1;
--color-secondary: #10B981;
--color-accent: #F59E0B;
--color-success: #06B6D4;
--color-danger: #EF4444;
--color-bg: #FFFFFF;
--color-surface: #F9FAFB;
--color-text: #1F2937;
--color-muted: #6B7280;
--color-border: #E5E7EB;

--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

--shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
--shadow-md: 0 10px 25px rgba(0,0,0,0.08);

--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

