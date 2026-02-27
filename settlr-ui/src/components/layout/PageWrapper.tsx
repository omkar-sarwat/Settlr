/**
 * Page Wrapper Component
 * 
 * Wraps each page's content with standardized animations.
 * Every page transition will fade in smoothly.
 * 
 * Usage:
 *   <PageWrapper>
 *     <h1>Dashboard</h1>
 *     ...page content...
 *   </PageWrapper>
 */

import { motion } from 'framer-motion';
import { pageTransition } from '@/animations/variants';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      {...pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
