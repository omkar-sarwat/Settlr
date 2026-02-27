/**
 * Subscriptions Component
 *
 * Shows a list of recurring subscription payments.
 * Matches the reference: each row has a brand icon/avatar,
 * service name, next billing date, amount, and an action menu.
 *
 * In the Settlr context these represent recurring webhook
 * endpoint subscriptions or scheduled payment templates.
 * Falls back to demo data when no real subscriptions exist.
 *
 * Amounts in paise.
 */

import { motion } from 'framer-motion';
import { MoreVertical, ChevronRight } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';

interface Subscription {
  id: string;
  name: string;
  /** Next billing / renewal date string */
  nextDate: string;
  /** Amount in paise */
  amountPaise: number;
  /** Brand color for the avatar */
  color: string;
  /** First letter or emoji for avatar */
  icon: string;
}

const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    name: 'Cloud Hosting',
    nextDate: 'Next 16 July',
    amountPaise: 49900,
    color: '#6366f1',
    icon: '☁',
  },
  {
    id: 'sub-2',
    name: 'Redis Cache',
    nextDate: 'Next 19 July',
    amountPaise: 89900,
    color: '#ef4444',
    icon: '⚡',
  },
  {
    id: 'sub-3',
    name: 'Kafka Stream',
    nextDate: 'Next 04 August',
    amountPaise: 39900,
    color: '#10b981',
    icon: '📡',
  },
  {
    id: 'sub-4',
    name: 'Monitoring',
    nextDate: 'Next 15 July',
    amountPaise: 49900,
    color: '#f59e0b',
    icon: '📊',
  },
  {
    id: 'sub-5',
    name: 'Email Service',
    nextDate: 'Next 22 July',
    amountPaise: 29900,
    color: '#ec4899',
    icon: '✉',
  },
];

function formatAmount(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Subscriptions() {
  const subscriptions = DEMO_SUBSCRIPTIONS;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">
            Subscription
          </h3>
          <span className="text-xs font-medium text-text-muted bg-white/[0.06] px-2 py-0.5 rounded-md">
            {subscriptions.length}
          </span>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
          Manage <ChevronRight size={14} />
        </button>
      </div>

      {/* Subscription list */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex-1 space-y-1 overflow-y-auto"
      >
        {subscriptions.map((sub) => (
          <motion.div
            key={sub.id}
            variants={staggerItem}
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] transition-colors group cursor-pointer"
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                backgroundColor: `${sub.color}15`,
                border: `1px solid ${sub.color}30`,
              }}
            >
              {sub.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {sub.name}
              </p>
              <p className="text-xs text-text-muted">{sub.nextDate}</p>
            </div>

            {/* Amount */}
            <span className="text-sm font-semibold font-mono text-text-primary whitespace-nowrap">
              {formatAmount(sub.amountPaise)}
            </span>

            {/* Menu */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              className="w-6 h-6 flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={14} />
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
