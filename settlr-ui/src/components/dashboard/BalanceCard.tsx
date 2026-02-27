/**
 * Balance Card Component
 * 
 * Displays the user's total balance in a prominent elevated glass card.
 * Features:
 * - Balance counts up from 0 on mount (creates impact)
 * - Subtle floating animation
 * - Weekly trend badge
 * - Call-to-action button to send money
 */

import { TrendingUp, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { GlowButton } from '@/components/ui/GlowButton';
import { Badge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';

interface BalanceCardProps {
  balancePaise: number;
  weeklyGrowthPercent: number;
}

export function BalanceCard({ balancePaise, weeklyGrowthPercent }: BalanceCardProps) {
  const navigate = useNavigate();

  return (
    <GlassCard 
      variant="elevated" 
      className="relative overflow-hidden animate-float"
    >
      {/* Subtle gradient overlay for visual depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-text-secondary font-medium mb-2">
              Total Balance
            </p>
            <AmountDisplay 
              paise={balancePaise} 
              size="balance" 
              animate 
              className="mb-3"
            />
            {/* Weekly trend indicator */}
            <div className="flex items-center gap-2">
              <Badge variant="success" className="flex items-center gap-1">
                <TrendingUp size={12} />
                <span>{weeklyGrowthPercent}% this week</span>
              </Badge>
            </div>
          </div>

          {/* Send Money CTA Button */}
          <GlowButton
            size="md"
            onClick={() => navigate('/send')}
            className="flex items-center gap-2"
          >
            <Zap size={16} />
            <span>Send Money</span>
          </GlowButton>
        </div>
      </div>
    </GlassCard>
  );
}
