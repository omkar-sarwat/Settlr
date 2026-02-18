// DashboardPage — greeting, 3 stat cards, 7-day chart, recent transactions
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getGreeting } from '../lib/formatDate';
import { useAuthStore } from '../store/authStore';
import { getMyAccounts } from '../api/account.api';
import { getWeeklyStats } from '../api/account.api';
import { useRecentTransactions } from '../hooks/useTransactions';
import { StatsRow } from '../components/dashboard/StatsRow';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';

/** Dashboard page — main landing page after login showing balance, activity, and recent transactions */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  // Fetch account data (balance)
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });

  // Fetch 7-day chart data
  const weeklyQuery = useQuery({
    queryKey: ['weekly-stats'],
    queryFn: getWeeklyStats,
    staleTime: 60_000,
  });

  // Fetch last 5 transactions
  const recentQuery = useRecentTransactions();

  // Derive values from account data
  const accounts = accountsQuery.data?.data || [];
  const primaryAccount = accounts[0];
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Calculate daily sent/received from recent transactions
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const recentTxns = recentQuery.data?.data || [];
  const todayTxns = recentTxns.filter((tx) => tx.createdAt.startsWith(todayStr));

  const sentToday = todayTxns
    .filter((tx) => tx.fromAccountId === primaryAccount?.id)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const receivedToday = todayTxns
    .filter((tx) => tx.toAccountId === primaryAccount?.id)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const sentCount = todayTxns.filter((tx) => tx.fromAccountId === primaryAccount?.id).length;
  const receivedCount = todayTxns.filter((tx) => tx.toAccountId === primaryAccount?.id).length;

  // Chart data
  const chartData = weeklyQuery.data?.data || [];

  const isLoading = accountsQuery.isLoading || recentQuery.isLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {format(new Date(), 'EEEE, d MMM yyyy')}
        </p>
      </div>

      {/* 3 stat cards */}
      <StatsRow
        balance={totalBalance}
        sentToday={sentToday}
        receivedToday={receivedToday}
        sentCount={sentCount}
        receivedCount={receivedCount}
        isLoading={isLoading}
      />

      {/* 7-day activity chart */}
      <ActivityChart
        data={chartData}
        isLoading={weeklyQuery.isLoading}
      />

      {/* Recent transactions */}
      <RecentTransactions
        transactions={recentTxns}
        currentAccountId={primaryAccount?.id || ''}
        isLoading={recentQuery.isLoading}
      />
    </div>
  );
}
