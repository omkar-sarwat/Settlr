/**
 * Sidebar Component
 * 
 * Main navigation sidebar with glass effect.
 * Shows logo, navigation links, and user profile at bottom.
 * 
 * Active link indicator slides smoothly between items using Framer Motion layoutId.
 * This creates a fluid transition when switching pages.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Send, 
  Receipt, 
  Shield, 
  LogOut,
  UserCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/send', label: 'Send Money', icon: Send },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/admin', label: 'Fraud Panel', icon: Shield, adminOnly: true },
  { path: '/profile', label: 'Profile', icon: UserCircle },
];

export function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-bg-surface/90 backdrop-blur-xl border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center">
        <img
          src="/settlr_logo.svg"
          alt="Settlr"
          className="h-8 w-auto"
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              'relative flex items-center gap-3 px-4 py-3 rounded-2xl',
              'text-sm font-medium transition-all duration-200',
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            )}
          >
            {({ isActive }) => (
              <>
                {/* Animated background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary-soft border-l-3 border-primary-500 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Icon and label */}
                <item.icon size={20} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section at Bottom */}
      <div className="p-4 border-t border-border-subtle">
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary-400 font-semibold">
            {getInitials(user?.name || null)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {user?.name || 'User'}
            </div>
            <div className="text-xs text-text-muted truncate">
              {user?.email || 'No email'}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
