// TransactionFilters — horizontal filter bar with type, period, status, search
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { TransactionFilters as TFilters } from '../../types';

interface TransactionFiltersProps {
  onFilterChange: (filters: TFilters) => void;
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
] as const;

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
] as const;

/** Filter bar that syncs with URL query params and triggers refetch */
export function TransactionFiltersBar({ onFilterChange }: TransactionFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL
  const [type, setType] = useState<string>(searchParams.get('type') || 'all');
  const [period, setPeriod] = useState<string>(searchParams.get('period') || 'all');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'all');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync filters to URL and trigger parent callback
  useEffect(() => {
    const params: Record<string, string> = {};
    if (type !== 'all') params.type = type;
    if (period !== 'all') params.period = period;
    if (status !== 'all') params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    setSearchParams(params, { replace: true });

    onFilterChange({
      type: type as TFilters['type'],
      period: period as TFilters['period'],
      status: status as TFilters['status'],
      search: debouncedSearch || undefined,
    });
  }, [type, period, status, debouncedSearch, setSearchParams, onFilterChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Type filter */}
      <SelectGroup
        options={TYPE_OPTIONS}
        value={type}
        onChange={setType}
      />

      {/* Period filter */}
      <SelectGroup
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
      />

      {/* Status filter */}
      <SelectGroup
        options={STATUS_OPTIONS}
        value={status}
        onChange={setStatus}
      />

      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full h-9 bg-bg-tertiary rounded-input text-sm text-text-primary
                     pl-9 pr-8 border border-bg-border
                     focus:outline-none focus:border-brand focus:shadow-input
                     placeholder:text-text-muted transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5
                       hover:bg-bg-border rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-text-muted" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pill-style select group ──────────────────────────────────────────────────

interface SelectGroupProps {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

function SelectGroup({ options, value, onChange }: SelectGroupProps) {
  return (
    <div className="flex bg-bg-tertiary rounded-input border border-bg-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-badge transition-all cursor-pointer',
            value === opt.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
