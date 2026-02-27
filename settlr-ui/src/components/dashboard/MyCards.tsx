/**
 * MyCards Component
 *
 * Shows a stack of payment cards (credit/debit) with a 3D perspective
 * stacking effect. Users can click "Add" to create a new card.
 * Displays card brand, last 4 digits, holder name, expiry.
 *
 * Since Settlr is a payment backend demo, we show user's account info
 * styled as virtual cards. Falls back to demo cards when no data.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';

interface VirtualCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'rupay';
  last4: string;
  holderName: string;
  expiry: string;
  gradient: string;
  brandColor: string;
}

const DEMO_CARDS: VirtualCard[] = [
  {
    id: 'card-1',
    brand: 'rupay',
    last4: '3286',
    holderName: '',
    expiry: '12/27',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    brandColor: '#a78bfa',
  },
  {
    id: 'card-2',
    brand: 'visa',
    last4: '3286',
    holderName: '',
    expiry: '09/26',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1a3f6f 100%)',
    brandColor: '#38bdf8',
  },
  {
    id: 'card-3',
    brand: 'visa',
    last4: '2358',
    holderName: '',
    expiry: '07/25',
    gradient: 'linear-gradient(135deg, #2a1a3a 0%, #3d1f5c 50%, #1f1035 100%)',
    brandColor: '#c084fc',
  },
];

function BrandLogo({ brand, color }: { brand: string; color: string }) {
  if (brand === 'visa') {
    return (
      <span className="text-lg font-extrabold italic tracking-widest" style={{ color }}>
        VISA
      </span>
    );
  }
  if (brand === 'rupay') {
    return (
      <span className="text-sm font-bold tracking-wide" style={{ color }}>
        RuPay
      </span>
    );
  }
  return (
    <span className="text-sm font-bold" style={{ color }}>
      {brand.toUpperCase()}
    </span>
  );
}

export function MyCards() {
  const { data: accountsData } = useAccounts();
  const [activeIndex, setActiveIndex] = useState(0);
  const accountCount = accountsData?.data?.length ?? 0;

  // Populate demo card holder names from real user data
  const cards = DEMO_CARDS.map((card, i) => ({
    ...card,
    holderName:
      accountsData?.data?.[i]
        ? `Account ${(accountsData.data[i].id || '').slice(-4).toUpperCase()}`
        : 'Settlr User',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">My cards</h3>
          <span className="text-xs font-medium text-text-muted bg-white/[0.06] px-2 py-0.5 rounded-md">
            {accountCount > 0 ? accountCount : cards.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Add
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus size={14} />
          </motion.button>
        </div>
      </div>

      {/* Stacked Cards */}
      <div className="relative flex-1 min-h-[160px]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: isActive ? 1 : Math.max(0.4, 1 - Math.abs(offset) * 0.3),
                  scale: 1 - Math.abs(offset) * 0.05,
                  y: offset * 28,
                  zIndex: cards.length - Math.abs(offset),
                  rotateX: offset * 2,
                }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={() => setActiveIndex(index)}
                className="absolute left-0 right-0 top-0 h-[130px] rounded-2xl cursor-pointer overflow-hidden"
                style={{
                  background: card.gradient,
                  transformStyle: 'preserve-3d',
                  perspective: '800px',
                }}
              >
                {/* Card shine effect */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 45%, transparent 60%)',
                  }}
                />

                {/* Card content */}
                <div className="relative h-full p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <BrandLogo brand={card.brand} color={card.brandColor} />
                    <span className="text-xs text-white/40 font-mono">
                      **** {card.last4}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-mono tracking-widest">
                      •••• •••• •••• {card.last4}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-white/60 font-medium">
                        {card.holderName}
                      </p>
                      <p className="text-xs text-white/40 font-mono">
                        {card.expiry}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Card indicator dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-4 bg-primary-400'
                : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
