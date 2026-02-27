/**
 * TopNav Component
 *
 * Horizontal navigation bar inspired by premium fintech dashboards.
 * Features:
 * - Settlr logo mark
 * - Navigation tabs with animated active indicator
 * - Search icon, notification bell, and user avatar
 * - Glassmorphism backdrop blur
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

interface NavTab {
  path: string;
  label: string;
}

const navTabs: NavTab[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/admin', label: 'Statistic' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/send', label: 'My wallet' },
];

function getInitials(name: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function TopNav() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [notifCount] = useState(3);

  return (
    <header className="relative z-50 flex items-center justify-between px-8 py-5">
      {/* Logo */}
      <motion.div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/dashboard')}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <img
          src="/settlr_logo.svg"
          alt="Settlr"
          className="h-8 w-auto"
        />
      </motion.div>

      {/* Center Nav Tabs */}
      <nav className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]">
        {navTabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              clsx(
                'relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="topnav-active"
                    className="absolute inset-0 bg-white/[0.08] rounded-xl"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right icons */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        >
          <Search size={18} />
        </motion.button>

        {/* Notification bell */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        >
          <Bell size={18} />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] rounded-full bg-danger-500 text-[10px] font-bold text-white flex items-center justify-center shadow-glow-danger">
              {notifCount}
            </span>
          )}
        </motion.button>

        {/* User avatar */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black cursor-pointer ring-2 ring-white/10 shadow-gold-glow"
        >
          {getInitials(user?.name || null)}
        </motion.div>
      </div>
    </header>
  );
}
