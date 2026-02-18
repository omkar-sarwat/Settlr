// Sidebar — left navigation (w-64, desktop only) — fintech dark mode
import { useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, LayoutDashboard, ArrowUpRight, Receipt, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/cn';

// All navigation links in the sidebar
const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Send Money', path: '/send', icon: ArrowUpRight },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Admin Panel', path: '/admin', icon: Shield },
] as const;

/** Left sidebar navigation — always visible on desktop, hidden on mobile */
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 h-full bg-bg-secondary border-r border-bg-tertiary flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2">
        <Hexagon className="w-7 h-7 text-brand" />
        <span className="text-lg font-bold text-text-primary">SETTLR</span>
      </div>

      <div className="border-b border-bg-tertiary" />

      {/* User info */}
      {user && (
        <div className="p-4 flex items-center gap-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          </div>
        </div>
      )}

      <div className="border-b border-bg-tertiary" />

      {/* Navigation links */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold',
                'transition-all duration-200 w-full text-left cursor-pointer',
                isActive
                  ? 'bg-brand text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary active:bg-bg-tertiary',
              )}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="border-b border-bg-tertiary" />

      {/* Sign out button */}
      <div className="p-3">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold
                     text-danger hover:bg-danger-bg/20 hover:text-danger transition-all duration-200 w-full text-left cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
