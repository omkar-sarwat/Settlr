// Card container — fintech dark mode with hover effects
import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

/** Reusable card container — fintech dark mode OLED theme */
export function Card({ children, className, padding = true, onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-secondary rounded-lg shadow-md border border-bg-tertiary',
        padding && 'p-6',
        'transition-all duration-200',
        hoverable && 'hover:shadow-lg hover:border-brand/40 hover:shadow-gold-glow hover:-translate-y-1 cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
