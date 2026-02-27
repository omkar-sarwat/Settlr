/**
 * Framer Motion animation variants for Settlr UI
 * Use these standard animations throughout the app for consistency
 * All animations respect the user's prefers-reduced-motion setting
 */

// Fade in with slight upward movement — use for cards, panels, modals
export const fadeInUp = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
};

// Simple fade in — use for overlays, backdrops
export const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.2 },
};

// Slide in from right — use for detail panels, side drawers
export const slideInRight = {
  initial:  { opacity: 0, x: 40 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: 40 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};

// Slide in from left — use for back navigation
export const slideInLeft = {
  initial:  { opacity: 0, x: -40 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: -40 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};

// Scale in — use for modals, important notifications
export const scaleIn = {
  initial:  { opacity: 0, scale: 0.92 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// Use staggerContainer on the parent div of a list
// This creates a cascade effect where children appear one after another
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

// Use staggerItem on each list item inside staggerContainer
// Each item will fade in and slide up with a slight delay
export const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// Wrap entire page content with this
// Creates smooth page transitions when navigating
export const pageTransition = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeInOut' as const },
};
