// RecipientStep — Step 1: search recipient by email/UUID with debounced lookup
import { useState, useEffect, useCallback } from 'react';
import { Search, User, Mail, ArrowRight } from 'lucide-react';
import { lookupAccount } from '../../api/account.api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import type { RecipientInfo } from '../../types';

interface RecipientStepProps {
  onSelect: (recipient: RecipientInfo) => void;
  initialRecipient: RecipientInfo | null;
}

/** Step 1 — user types email or account ID, debounced 500ms search, preview card */
export function RecipientStep({ onSelect, initialRecipient }: RecipientStepProps) {
  const [query, setQuery] = useState(initialRecipient?.email || '');
  const [isSearching, setIsSearching] = useState(false);
  const [recipient, setRecipient] = useState<RecipientInfo | null>(initialRecipient);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search — waits 500ms after user stops typing
  const searchRecipient = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setRecipient(null);
      setError('');
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError('');
    setHasSearched(true);

    try {
      const result = await lookupAccount(searchQuery);
      if (result.data) {
        setRecipient(result.data);
        setError('');
      } else {
        setRecipient(null);
        setError('No account found for this email or ID');
      }
    } catch {
      setRecipient(null);
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce effect — fires 500ms after query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchRecipient(query.trim());
      } else {
        setRecipient(null);
        setError('');
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchRecipient]);

  function handleContinue() {
    if (recipient) {
      onSelect(recipient);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Who are you sending to?</h2>
        <p className="text-sm text-text-secondary mt-1">
          Enter their email address or account ID
        </p>
      </div>

      {/* Search input */}
      <Input
        label="Recipient"
        placeholder="Enter email address or account ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={Search}
        rightElement={isSearching ? <Spinner size="sm" /> : undefined}
        error={error}
      />

      {/* Recipient preview card */}
      {recipient && (
        <Card className="border border-success-DEFAULT/30 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-4">
            <Avatar name={recipient.name} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">{recipient.name}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                <p className="text-xs text-text-secondary">{recipient.email}</p>
              </div>
              <p className="text-xs text-text-muted mt-1 font-mono">
                Account: ••••{recipient.accountId.slice(-4)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-bg rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-success-text" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No results message */}
      {hasSearched && !isSearching && !recipient && !error && (
        <p className="text-sm text-text-muted text-center py-4">
          No account found
        </p>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          label="Continue"
          onClick={handleContinue}
          disabled={!recipient}
          icon={ArrowRight}
        />
      </div>
    </div>
  );
}
