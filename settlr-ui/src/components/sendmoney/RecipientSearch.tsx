/**
 * Recipient Search Component
 * 
 * First step in Send Money flow.
 * Shows:
 * - Search input with glass styling
 * - Recent recipients (quick select)
 * - Search results with avatars
 * - Selection triggers next step
 */

import { useState, useMemo } from 'react';
import { Search, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { useAccountLookup } from '@/hooks/useAccounts';
import { useAccounts } from '@/hooks/useAccounts';
import type { Transaction } from '@/types';

export interface Recipient {
  id: string;
  name: string;
  accountNumber: string;
  lastTransacted?: string;
}

interface RecipientSearchProps {
  onSelectRecipient: (recipient: Recipient) => void;
}

export function RecipientSearch({ onSelectRecipient }: RecipientSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: recentTransactionsData, isLoading: recentLoading } = useRecentTransactions();
  const { data: searchData, isLoading: searchLoading } = useAccountLookup(searchQuery);
  const { data: accountsData } = useAccounts();

  const primaryAccountId = accountsData?.data?.[0]?.id;

  // Map recent transactions to recipients (unique recipients from recent activity)
  const recentRecipients: Recipient[] = useMemo(() => {
    if (!recentTransactionsData?.data || !primaryAccountId) return [];

    const uniqueRecipients = new Map<string, Recipient>();

    recentTransactionsData.data.forEach((txn: Transaction) => {
      const isSent = txn.fromAccountId === primaryAccountId;
      const recipientId = isSent ? txn.toAccountId : txn.fromAccountId;
      const recipientName = isSent ? txn.toUserName : txn.fromUserName;

      if (recipientName && !uniqueRecipients.has(recipientId)) {
        uniqueRecipients.set(recipientId, {
          id: recipientId,
          name: recipientName,
          accountNumber: recipientId,
          lastTransacted: new Date(txn.createdAt).toLocaleDateString(),
        });
      }
    });

    return Array.from(uniqueRecipients.values()).slice(0, 5); // Top 5 recent
  }, [recentTransactionsData, primaryAccountId]);

  // Map search results to Recipient format (now returns array)
  const searchRecipients: Recipient[] = useMemo(() => {
    if (!searchData?.data || !Array.isArray(searchData.data)) return [];
    
    return searchData.data.map((item: { accountId: string; name: string; email: string }) => ({
      id: item.accountId,
      name: item.name || item.email,
      accountNumber: item.accountId,
    }));
  }, [searchData]);

  const recipientsToShow = searchQuery.trim().length >= 2 ? searchRecipients : recentRecipients;
  const isLoading = searchQuery.trim().length >= 2 ? searchLoading : recentLoading;

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Search by name or account number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-glass w-full pl-12 pr-4"
          autoFocus
        />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        {searchQuery.trim() ? (
          <>
            <Search className="w-4 h-4" />
            <span>Search Results</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>Recent Recipients</span>
          </>
        )}
      </div>

      {/* Recipient List */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="w-5 h-5" />
            </GlassCard>
          ))}
        </div>
      )}

      {!isLoading && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {recipientsToShow.length === 0 ? (
            <GlassCard className="text-center py-12">
              <div className="text-text-tertiary">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recipients found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            </GlassCard>
          ) : (
            recipientsToShow.map((recipient) => (
              <motion.div key={recipient.id} variants={staggerItem}>
                <GlassCard
                  hoverable
                  onClick={() => onSelectRecipient(recipient)}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={recipient.name} size="md" />
                    <div>
                      <p className="text-text-primary font-medium group-hover:text-primary-light transition-colors">
                        {recipient.name}
                      </p>
                      <p className="text-sm text-text-tertiary font-mono">
                        {recipient.accountNumber}
                      </p>
                      {recipient.lastTransacted && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Last transaction: {recipient.lastTransacted}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-primary-light group-hover:translate-x-1 transition-all" />
                </GlassCard>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
