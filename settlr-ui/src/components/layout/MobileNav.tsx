// MobileNav — bottom navigation bar for mobile screens
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowUpRight, Receipt, Shield } from 'lucide-react';
import { cn } from '../../lib/cn';

const NAV_ITEMS = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Send', path: '/send', icon: ArrowUpRight },
  { label: 'History', path: '/transactions', icon: Receipt },
  { label: 'Admin', path: '/admin', icon: Shield },
] as const;

/** Fixed bottom navigation bar — only visible on mobile (md:hidden) */
export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border
                    flex items-center justify-around py-2 px-1 z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-input',
              'transition-all duration-normal min-w-[60px]',
              isActive
                ? 'text-brand'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
