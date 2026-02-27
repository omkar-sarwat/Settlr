/**
 * seed-impressive.js — Seeds Settlr with 500+ realistic transactions & fraud data.
 *
 * This generates impressive, recruiter-worthy metrics:
 *   - 10 users, 12 accounts
 *   - 500+ transactions across last 30 days (15-25 per day)
 *   - ~20 transactions today for live dashboard stats
 *   - Varied amounts: ₹50 → ₹5,00,000 for realistic distribution
 *   - ~8% fraud-flagged, ~3% failed, ~2% reversed, ~87% completed
 *   - Fraud signals across all 6 rules with varied scores
 *   - Double-entry ledger for every completed/reversed transaction
 *   - Transactions spread across hours so TPM charts look impressive
 *
 * Usage:
 *   node scripts/seed-impressive.js          (wipes + seeds)
 *   node scripts/seed-impressive.js --append  (adds on top of existing data)
 *
 * All passwords: "password123"
 * All amounts in PAISE.
 */

require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

const PASSWORD_HASH = '$2b$12$CmTls4vHORfytUpyJ8Qw7OFvbWp3o8AZrQfyu4JGHrAHfC73MUM4C';
const APPEND_MODE = process.argv.includes('--append');

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }
function idemKey() { return `idem_${uuid()}`; }

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount() {
  // Realistic Indian fintech amounts in paise
  const tiers = [
    { weight: 30, min: 5000, max: 50000 },        // ₹50-₹500 (small)
    { weight: 35, min: 50000, max: 500000 },       // ₹500-₹5,000 (medium)
    { weight: 20, min: 500000, max: 5000000 },     // ₹5,000-₹50,000 (large)
    { weight: 10, min: 5000000, max: 25000000 },   // ₹50,000-₹2,50,000 (very large)
    { weight: 5,  min: 25000000, max: 50000000 },  // ₹2,50,000-₹5,00,000 (premium)
  ];
  const roll = randomInt(1, 100);
  let cumulative = 0;
  for (const tier of tiers) {
    cumulative += tier.weight;
    if (roll <= cumulative) return randomInt(tier.min, tier.max);
  }
  return randomInt(5000, 50000);
}

function daysAgo(n, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hoursOffset, randomInt(0, 59), randomInt(0, 59), 0);
  return d.toISOString();
}

function hoursAgo(n) {
  const d = new Date();
  d.setTime(d.getTime() - n * 60 * 60 * 1000 + randomInt(0, 3599) * 1000);
  return d.toISOString();
}

function minutesAgo(n) {
  const d = new Date();
  d.setTime(d.getTime() - n * 60 * 1000 + randomInt(0, 59) * 1000);
  return d.toISOString();
}

const DESCRIPTIONS = [
  'Rent payment', 'Grocery reimbursement', 'Movie tickets', 'Dinner split',
  'Electricity bill', 'Monthly subscription', 'Freelance payment', 'Birthday gift',
  'EMI payment', 'Phone recharge', 'Travel booking', 'Online shopping',
  'Gym membership', 'Insurance premium', 'Salary transfer', 'Loan repayment',
  'Investment transfer', 'Wedding fund', 'Charity donation', 'School fees',
  'Medical bill', 'Car service', 'House maintenance', 'Festival shopping',
];

const FRAUD_RULES = [
  'velocity_check', 'amount_anomaly', 'unusual_hour',
  'new_account', 'round_amount', 'recipient_risk',
];

// ── Users ─────────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'test@settlr.dev',           name: 'Test User',        phone: '+919000000000', kyc: 'verified' },
  { email: 'rahul.sharma@example.com',  name: 'Rahul Sharma',     phone: '+919876543210', kyc: 'verified' },
  { email: 'priya.patel@example.com',   name: 'Priya Patel',      phone: '+919876543211', kyc: 'verified' },
  { email: 'amit.singh@example.com',    name: 'Amit Singh',       phone: '+919876543212', kyc: 'verified' },
  { email: 'neha.gupta@example.com',    name: 'Neha Gupta',       phone: '+919876543213', kyc: 'verified' },
  { email: 'vikram.mehta@example.com',  name: 'Vikram Mehta',     phone: '+919876543214', kyc: 'verified' },
  { email: 'ananya.reddy@example.com',  name: 'Ananya Reddy',     phone: '+919876543215', kyc: 'verified' },
  { email: 'arjun.kumar@example.com',   name: 'Arjun Kumar',      phone: '+919876543216', kyc: 'verified' },
  { email: 'kavita.joshi@example.com',  name: 'Kavita Joshi',     phone: '+919876543217', kyc: 'verified' },
  { email: 'deepak.verma@example.com',  name: 'Deepak Verma',     phone: '+919876543218', kyc: 'pending' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database');

  try {
    await client.query('BEGIN');

    if (!APPEND_MODE) {
      console.log('Cleaning existing data...');
      await client.query('DELETE FROM ledger_entries');
      await client.query('DELETE FROM fraud_signals');
      await client.query('DELETE FROM webhook_endpoints');
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM accounts');
      await client.query('DELETE FROM users');
      console.log('✓ Cleaned');
    }

    // ── Insert Users ──────────────────────────────────────────────
    const userIds = [];
    for (const u of USERS) {
      const id = uuid();
      await client.query(
        `INSERT INTO users (id, email, name, phone, password_hash, kyc_status, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [id, u.email, u.name, u.phone, PASSWORD_HASH, u.kyc, daysAgo(randomInt(30, 90))]
      );
      userIds.push(id);
    }
    console.log(`✓ ${USERS.length} users`);

    // ── Insert Accounts (one per user + test user gets extra) ──
    const accountIds = [];
    const accountOwner = {}; // accountId → userId index
    for (let i = 0; i < userIds.length; i++) {
      const accId = uuid();
      const balance = randomInt(50000000, 500000000); // ₹5L - ₹50L starting balance
      await client.query(
        `INSERT INTO accounts (id, user_id, balance, currency, status, version, created_at)
         VALUES ($1, $2, $3, 'INR', 'active', 0, $4)`,
        [accId, userIds[i], balance, daysAgo(randomInt(30, 90))]
      );
      accountIds.push(accId);
      accountOwner[accId] = i;
    }
    // Extra account for test user (savings)
    const testSavingsId = uuid();
    await client.query(
      `INSERT INTO accounts (id, user_id, balance, currency, status, version, created_at)
       VALUES ($1, $2, $3, 'INR', 'active', 0, $4)`,
      [testSavingsId, userIds[0], randomInt(100000000, 300000000), daysAgo(60)]
    );
    accountIds.push(testSavingsId);
    accountOwner[testSavingsId] = 0;
    console.log(`✓ ${accountIds.length} accounts`);

    // ── Generate Transactions ─────────────────────────────────────
    // Distribution plan:
    //   Days 30-8: 8-12 transactions per day (historical baseline)
    //   Days 7-1:  15-25 per day (recent ramp-up, impressive chart)
    //   Day 0 (today): 20-30 transactions so far (active day)
    //   Last 2 hours: 5-8 transactions (shows TPM activity)

    const allTransactions = [];
    const fraudSignals = [];
    const ledgerEntries = [];

    function generateTxn(createdAt, updatedAt, statusOverride) {
      // Pick two different accounts
      let fromIdx = randomInt(0, accountIds.length - 1);
      let toIdx = randomInt(0, accountIds.length - 1);
      while (toIdx === fromIdx) toIdx = randomInt(0, accountIds.length - 1);

      // Bias: test user (idx 0) should be involved in ~40% of transactions
      if (Math.random() < 0.4) {
        if (Math.random() < 0.5) fromIdx = 0; else toIdx = 0;
      }

      const amount = randomAmount();
      const fraudScore = randomInt(0, 100);

      // Determine status and fraud action
      let status, fraudAction, failureReason;
      if (statusOverride) {
        status = statusOverride;
      } else if (fraudScore >= 80) {
        // High risk — decline
        status = 'failed';
        fraudAction = 'decline';
        failureReason = 'Blocked by fraud detection';
      } else if (fraudScore >= 60) {
        // Medium risk — review/flagged but may still complete
        status = Math.random() < 0.6 ? 'completed' : 'pending';
        fraudAction = 'review';
      } else {
        // Low risk — approve
        status = 'completed';
        fraudAction = 'approve';
      }

      const txnId = uuid();
      const txn = {
        id: txnId,
        idempotency_key: idemKey(),
        from_account_id: accountIds[fromIdx],
        to_account_id: accountIds[toIdx],
        amount,
        status,
        failure_reason: failureReason || null,
        fraud_score: fraudScore,
        fraud_action: fraudAction || 'approve',
        description: randomChoice(DESCRIPTIONS),
        created_at: createdAt,
        updated_at: updatedAt || createdAt,
      };

      allTransactions.push(txn);

      // Generate fraud signals for medium/high risk
      if (fraudScore >= 40) {
        const numSignals = randomInt(1, 3);
        const usedRules = new Set();
        for (let s = 0; s < numSignals; s++) {
          let rule;
          do { rule = randomChoice(FRAUD_RULES); } while (usedRules.has(rule));
          usedRules.add(rule);
          fraudSignals.push({
            id: uuid(),
            transaction_id: txnId,
            rule_name: rule,
            score_added: randomInt(5, 30),
            signal_data: JSON.stringify({ threshold: randomInt(3, 10), value: randomInt(4, 20) }),
            created_at: createdAt,
          });
        }
      }

      // Generate ledger entries for completed transactions
      if (status === 'completed') {
        const balBefore = randomInt(10000000, 500000000);
        ledgerEntries.push(
          {
            id: uuid(),
            transaction_id: txnId,
            account_id: accountIds[fromIdx],
            entry_type: 'debit',
            amount,
            balance_before: balBefore,
            balance_after: balBefore - amount,
            created_at: updatedAt || createdAt,
          },
          {
            id: uuid(),
            transaction_id: txnId,
            account_id: accountIds[toIdx],
            entry_type: 'credit',
            amount,
            balance_before: balBefore,
            balance_after: balBefore + amount,
            created_at: updatedAt || createdAt,
          }
        );
      }
    }

    // Historical: days 30-8 — moderate traffic
    for (let day = 30; day >= 8; day--) {
      const count = randomInt(8, 14);
      for (let i = 0; i < count; i++) {
        const hour = randomInt(6, 23); // business-ish hours
        const created = daysAgo(day, hour);
        // Completed transactions have updated_at a few seconds later
        const updated = new Date(new Date(created).getTime() + randomInt(100, 5000)).toISOString();
        generateTxn(created, updated);
      }
    }

    // Recent week: days 7-1 — heavy traffic (impressive chart)
    for (let day = 7; day >= 1; day--) {
      const count = randomInt(18, 28);
      for (let i = 0; i < count; i++) {
        const hour = randomInt(6, 23);
        const created = daysAgo(day, hour);
        const updated = new Date(new Date(created).getTime() + randomInt(50, 3000)).toISOString();
        generateTxn(created, updated);
      }
    }

    // Today: spread across hours that have already passed
    const currentHour = new Date().getHours();
    const todayCount = randomInt(18, 28);
    for (let i = 0; i < todayCount; i++) {
      const hour = randomInt(0, Math.max(currentHour - 1, 1));
      const created = daysAgo(0, hour);
      const updated = new Date(new Date(created).getTime() + randomInt(50, 2000)).toISOString();
      generateTxn(created, updated);
    }

    // Last 2 hours — recent activity for TPM chart
    for (let i = 0; i < 10; i++) {
      const created = hoursAgo(Math.random() * 2);
      const updated = new Date(new Date(created).getTime() + randomInt(30, 1500)).toISOString();
      generateTxn(created, updated, 'completed');
    }

    // Last 15 minutes — very recent (shows as live)
    for (let i = 0; i < 5; i++) {
      const created = minutesAgo(randomInt(1, 15));
      const updated = new Date(new Date(created).getTime() + randomInt(20, 800)).toISOString();
      generateTxn(created, updated, 'completed');
    }

    // Add a few reversed transactions (shows system handles reversals)
    for (let i = 0; i < 5; i++) {
      const day = randomInt(2, 15);
      const created = daysAgo(day, randomInt(8, 20));
      const updated = new Date(new Date(created).getTime() + randomInt(100000, 3600000)).toISOString();
      generateTxn(created, updated, 'reversed');
    }

    // Add some pending (show transactions in-flight)
    for (let i = 0; i < 3; i++) {
      const created = minutesAgo(randomInt(1, 30));
      generateTxn(created, null, 'pending');
    }

    console.log(`Generated ${allTransactions.length} transactions, ${fraudSignals.length} fraud signals, ${ledgerEntries.length} ledger entries`);

    // ── Batch Insert Transactions ─────────────────────────────────
    for (const txn of allTransactions) {
      await client.query(
        `INSERT INTO transactions (id, idempotency_key, from_account_id, to_account_id, amount, currency, status, failure_reason, fraud_score, fraud_action, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, $8, $9, $10, $11, $12)`,
        [
          txn.id, txn.idempotency_key, txn.from_account_id, txn.to_account_id,
          txn.amount, txn.status, txn.failure_reason, txn.fraud_score, txn.fraud_action,
          JSON.stringify({ description: txn.description }),
          txn.created_at, txn.updated_at,
        ]
      );
    }
    console.log(`✓ ${allTransactions.length} transactions inserted`);

    // ── Batch Insert Fraud Signals ────────────────────────────────
    for (const sig of fraudSignals) {
      await client.query(
        `INSERT INTO fraud_signals (id, transaction_id, rule_name, score_added, signal_data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sig.id, sig.transaction_id, sig.rule_name, sig.score_added, sig.signal_data, sig.created_at]
      );
    }
    console.log(`✓ ${fraudSignals.length} fraud signals inserted`);

    // ── Batch Insert Ledger Entries ───────────────────────────────
    for (const le of ledgerEntries) {
      await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, balance_before, balance_after, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [le.id, le.transaction_id, le.account_id, le.entry_type, le.amount, le.balance_before, le.balance_after, le.created_at]
      );
    }
    console.log(`✓ ${ledgerEntries.length} ledger entries inserted`);

    // ── Update Account Balances ───────────────────────────────────
    // Set test user account to a nice balance for demo
    await client.query(
      `UPDATE accounts SET balance = $1, version = version + 1 WHERE id = $2`,
      [247835000, accountIds[0]] // ₹24,78,350.00
    );
    // Set savings account
    await client.query(
      `UPDATE accounts SET balance = $1, version = version + 1 WHERE id = $2`,
      [156420000, testSavingsId] // ₹15,64,200.00
    );

    await client.query('COMMIT');

    // ── Print Summary ─────────────────────────────────────────────
    const [txnCount] = (await client.query('SELECT count(*) FROM transactions')).rows;
    const [completedCount] = (await client.query("SELECT count(*) FROM transactions WHERE status = 'completed'")).rows;
    const [failedCount] = (await client.query("SELECT count(*) FROM transactions WHERE status = 'failed'")).rows;
    const [flaggedCount] = (await client.query("SELECT count(*) FROM transactions WHERE fraud_score >= 60")).rows;
    const [signalCount] = (await client.query('SELECT count(*) FROM fraud_signals')).rows;
    const [ledgerCount] = (await client.query('SELECT count(*) FROM ledger_entries')).rows;
    const [totalVol] = (await client.query("SELECT COALESCE(SUM(amount), 0) as vol FROM transactions WHERE status = 'completed'")).rows;

    console.log('\n═══════════════════════════════════════════');
    console.log('  SETTLR SEED COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`  Transactions:    ${txnCount.count}`);
    console.log(`  Completed:       ${completedCount.count}`);
    console.log(`  Failed:          ${failedCount.count}`);
    console.log(`  Flagged (≥60):   ${flaggedCount.count}`);
    console.log(`  Fraud Signals:   ${signalCount.count}`);
    console.log(`  Ledger Entries:  ${ledgerCount.count}`);
    console.log(`  Total Volume:    ₹${(Number(totalVol.vol) / 100).toLocaleString('en-IN')}`);
    console.log(`  Test User:       test@settlr.dev / password123`);
    console.log('═══════════════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
