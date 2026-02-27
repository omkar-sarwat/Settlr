/**
 * Transaction Filter Component
 * 
 * Allows filtering transactions by:
 * - Type (All, Sent, Received)
 * - Status (All, Success, Failed, Pending)
 * - Date Range (quick picks + custom)
 */

import { Calendar, Filter } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export type TransactionType = 'all' | 'sent' | 'received';
export type TransactionStatus = 'all' | 'success' | 'failed' | 'pending';

export interface FilterState {
  type: TransactionType;
  status: TransactionStatus;
  dateRange: 'all' | '7days' | '30days' | 'custom';
  searchQuery: string;
}

interface TransactionFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function TransactionFilter({ filters, onFilterChange }: TransactionFilterProps) {
  const updateFilter = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-text-secondary">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          {(['all', 'sent', 'received'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateFilter('type', type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filters.type === type
                  ? 'bg-primary-dark text-white shadow-glow-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {type === 'all' ? 'All' : type === 'sent' ? 'Sent' : 'Received'}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border-default" />

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'success', 'failed', 'pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => updateFilter('status', status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filters.status === status
                  ? 'bg-primary-dark text-white shadow-glow-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border-default" />

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="bg-bg-elevated border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-dark/50"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Search by recipient, amount, or transaction ID..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="input-glass w-full"
        />
      </div>
    </GlassCard>
  );
}
