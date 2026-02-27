/**
 * WalletCard Component
 *
 * Large hero card showing the user's primary wallet balance.
 * Matches the reference: dark card with gold gradient overlay,
 * wallet type label, animated balance, revenue change, and
 * Transfer / Top Up action buttons.
 *
 * All money values are in paise (integer). Display only happens here.
 */

import { motion } from 'framer-motion';
import { Wallet, ArrowRightLeft, Plus, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { clsx } from 'clsx';

interface WalletCardProps {
  /** Total balance in paise */
  balance: number;
  /** Revenue change from last month in paise */
  revenue: number;
}

function formatDisplay(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function WalletCard({ balance, revenue }: WalletCardProps) {
  const navigate = useNavigate();
  const animatedBalance = useCountUp(balance, 1200);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative h-full rounded-3xl overflow-hidden p-6 flex flex-col justify-between"
      style={{
        background:
          'linear-gradient(135deg, #2a2108 0%, #3d2e07 30%, #1a1600 70%, #0f0f13 100%)',
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(250,204,21,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Top row: label + icons */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-amber-400/70" />
          <span className="text-sm font-medium text-amber-200/70">
            Wallet(INR)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-amber-200/50 hover:text-amber-200 transition-colors"
          >
            <Copy size={14} />
          </motion.button>
        </div>
      </div>

      {/* Balance */}
      <div className="relative mt-4">
        <motion.div
          className="text-[2.8rem] leading-none font-bold tracking-tight text-white"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <span className="text-amber-200/60 text-3xl mr-1">₹</span>
          {formatDisplay(animatedBalance)}
        </motion.div>

        <p className="text-sm text-amber-200/50 mt-2">
          +₹{formatDisplay(revenue)} revenue from last month
        </p>
      </div>

      {/* Action buttons */}
      <div className="relative flex gap-3 mt-5">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/send')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl',
            'bg-white/[0.08] backdrop-blur border border-white/[0.08]',
            'text-sm font-semibold text-white/90 hover:bg-white/[0.12] transition-all'
          )}
        >
          <ArrowRightLeft size={16} />
          Transfer
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl',
            'bg-white/[0.08] backdrop-blur border border-white/[0.08]',
            'text-sm font-semibold text-white/90 hover:bg-white/[0.12] transition-all'
          )}
        >
          <Plus size={16} />
          Top Up
        </motion.button>
      </div>
    </motion.div>
  );
}
