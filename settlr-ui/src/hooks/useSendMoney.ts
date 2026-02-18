// useSendMoney — TanStack Query mutation for sending money
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMoney } from '../api/payment.api';
import type { SendMoneyParams } from '../types';

/**
 * Mutation hook for sending money.
 * After success, automatically refreshes the transaction list and account balance cache.
 * The calling component should handle success/error UI states.
 */
export function useSendMoney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SendMoneyParams) => sendMoney(params),
    onSuccess: () => {
      // Invalidate these cache keys so they refetch with fresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
