// EmptyState — centered message with icon, title, description, and optional action button
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Shows a centered empty/error state — use when a list has no data or when an error occurs */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-text-muted" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-secondary max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <Button
          label={action.label}
          onClick={action.onClick}
          variant="secondary"
        />
      )}
    </div>
  );
}
