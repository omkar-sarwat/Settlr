// All shared TypeScript interfaces for the Settlr frontend

// ── User & Auth ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  account: {
    id: string;
    balance: number;
    currency: string;
  } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (
    user: User,
    account: { id: string; balance: number; currency: string },
    accessToken: string
  ) => void;
  clearAuth: () => void;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    account: {
      id: string;
      balance: number;
      currency: string;
    };
  };
  traceId: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    account: {
      id: string;
      balance: number;
      currency: string;
    };
  };
  traceId: string;
}

// ── Account ───────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  userId: string;
  balance: number;          // Always paise (integer)
  currency: 'INR';
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
}

export interface AccountListResponse {
  success: boolean;
  data: Account[];
  traceId: string;
}

export interface AccountResponse {
  success: boolean;
  data: Account;
  traceId: string;
}

// ── Transaction ───────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromUserName?: string;
  toUserName?: string;
  amount: number;           // Always paise
  currency: 'INR';
  status: 'pending' | 'completed' | 'failed' | 'reversed' | 'fraud_blocked';
  fraudScore?: number;      // 0 to 100
  fraudAction?: 'approve' | 'review' | 'challenge' | 'decline';
  description?: string;
  failureReason?: string;
  createdAt: string;
}

export interface TransactionFilters {
  type?: 'all' | 'sent' | 'received';
  period?: 'today' | 'week' | 'month' | 'all';
  status?: 'all' | 'completed' | 'pending' | 'failed';
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  success: boolean;
  data: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  traceId: string;
}

export interface TransactionDetailResponse {
  success: boolean;
  data: {
    transaction: Transaction;
    signals: FraudSignal[];
    ledger: LedgerEntry[];
  };
  traceId: string;
}

// ── Fraud ─────────────────────────────────────────────────────────────────────

export interface FraudSignal {
  ruleName: string;          // e.g. "VELOCITY_CHECK"
  scoreAdded: number;        // Points this rule added
  description?: string;      // Human-readable description
  data: Record<string, unknown>;
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'debit' | 'credit';
  amount: number;            // In paise
  balanceBefore: number;     // In paise
  balanceAfter: number;      // In paise
  createdAt: string;
}

// ── Send Money ────────────────────────────────────────────────────────────────

export interface SendMoneyParams {
  fromAccountId: string;
  toAccountId: string;
  amount: number;            // In paise
  currency: 'INR';
  description?: string;
  idempotencyKey: string;
}

export interface SendMoneyResponse {
  success: boolean;
  data: Transaction;
  traceId: string;
  fromCache?: boolean;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminMetrics {
  totalVolumeToday: number;            // Paise
  successRate: number;                 // 0-100 percentage
  fraudBlockRate: number;              // 0-100 percentage
  avgLatencyMs: number;                // Milliseconds
  p50LatencyMs: number;               // P50 latency
  p95LatencyMs: number;               // P95 latency
  p99LatencyMs: number;               // P99 latency
  transactionsPerMinute: TransactionPerMinute[];
  signalBreakdown: SignalBreakdown[];
  totalTransactions: number;           // All-time completed count
  totalVolume: number;                 // All-time completed volume (paise)
  activeUsersToday: number;            // Unique users today
}

export interface TransactionPerMinute {
  timestamp: string;
  count: number;
}

export interface SignalBreakdown {
  ruleName: string;
  count: number;
}

export interface FlaggedTransaction extends Transaction {
  signals: FraudSignal[];
}

// ── Chart Data ────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  day: string;       // "Mon", "Tue", etc.
  sent: number;      // Total sent that day in paise
  received: number;  // Total received that day in paise
}

// ── API Response wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  traceId: string;
}

// ── Send Money Flow State ─────────────────────────────────────────────────────

export type SendStep = 1 | 2 | 3;

export interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  accountId: string;
}

export interface SendMoneyFlowState {
  step: SendStep;
  recipient: RecipientInfo | null;
  amountPaise: number;
  description: string;
}
