/**
 * seed-data.js — Populates the Settlr database with realistic test data.
 *
 * Creates:
 *   - 8 users (all password: "password123")
 *   - 10 accounts across those users
 *   - 40+ transactions (completed, pending, failed, reversed)
 *   - Fraud signals on flagged transactions
 *   - Ledger entries for completed/reversed transactions
 *   - Webhook endpoints for 2 merchant users
 *
 * Usage:
 *   node scripts/seed-data.js          (uses .env DATABASE_URL)
 *   node scripts/seed-data.js --clean  (wipe all data first, then seed)
 *
 * All passwords are "password123" hashed with bcrypt (12 rounds).
 * All amounts are in PAISE (₹1 = 100 paise).
 */

require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

// Pre-computed bcrypt hash for "password123" with 12 rounds
// Generated via: require('bcrypt').hashSync('password123', 12)
const PASSWORD_HASH = '$2b$12$CmTls4vHORfytUpyJ8Qw7OFvbWp3o8AZrQfyu4JGHrAHfC73MUM4C';

const CLEAN_MODE = process.argv.includes('--clean');

// ── User Data ─────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'rahul.sharma@example.com',   name: 'Rahul Sharma',     phone: '+919876543210', kyc: 'verified' },
  { email: 'priya.patel@example.com',    name: 'Priya Patel',      phone: '+919876543211', kyc: 'verified' },
  { email: 'amit.singh@example.com',     name: 'Amit Singh',       phone: '+919876543212', kyc: 'verified' },
  { email: 'neha.gupta@example.com',     name: 'Neha Gupta',       phone: '+919876543213', kyc: 'verified' },
  { email: 'vikram.mehta@example.com',   name: 'Vikram Mehta',     phone: '+919876543214', kyc: 'verified' },
  { email: 'ananya.reddy@example.com',   name: 'Ananya Reddy',     phone: '+919876543215', kyc: 'pending' },
  { email: 'arjun.kumar@example.com',    name: 'Arjun Kumar',      phone: '+919876543216', kyc: 'verified' },
  { email: 'test@settlr.dev',            name: 'Test User',        phone: '+919000000000', kyc: 'verified' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

function idemKey() {
  return `idem_${uuid()}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('FATAL: DATABASE_URL not set. Create .env from .env.example.');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database.\n');

  try {
    if (CLEAN_MODE) {
      console.log('🧹 Cleaning existing data...');
      await client.query('DELETE FROM webhook_deliveries');
      await client.query('DELETE FROM webhook_endpoints');
      await client.query('DELETE FROM fraud_signals');
      await client.query('DELETE FROM ledger_entries');
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM accounts');
      await client.query('DELETE FROM users');
      console.log('   All tables cleared.\n');
    }

    // ── 1. Users ────────────────────────────────────────────────────────────
    console.log('Creating users...');
    const userIds = [];
    for (const u of USERS) {
      const res = await client.query(
        `INSERT INTO users (id, email, name, phone, password_hash, kyc_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [uuid(), u.email, u.name, u.phone, PASSWORD_HASH, u.kyc]
      );
      userIds.push(res.rows[0].id);
      console.log(`   ✓ ${u.name} (${u.email})`);
    }

    // ── 2. Accounts ─────────────────────────────────────────────────────────
    console.log('\nCreating accounts...');
    const accountIds = [];
    const accountBalances = [];

    // Each user gets a primary account; some get a secondary
    const initialBalances = [
      500000_00,  // ₹5,00,000
      250000_00,  // ₹2,50,000
      100000_00,  // ₹1,00,000
       75000_00,  // ₹75,000
      350000_00,  // ₹3,50,000
       15000_00,  // ₹15,000
      200000_00,  // ₹2,00,000
      150000_00,  // ₹1,50,000 (test user)
    ];

    for (let i = 0; i < userIds.length; i++) {
      const balance = initialBalances[i];
      const res = await client.query(
        `INSERT INTO accounts (id, user_id, balance, currency, status, version)
         VALUES ($1, $2, $3, 'INR', 'active', 0)
         RETURNING id`,
        [uuid(), userIds[i], balance]
      );
      accountIds.push(res.rows[0].id);
      accountBalances.push(balance);
      console.log(`   ✓ Account for ${USERS[i].name}: ₹${(balance / 100).toLocaleString('en-IN')}`);
    }

    // Secondary accounts for Rahul and Vikram
    for (const idx of [0, 4]) {
      const secondaryBalance = 50000_00; // ₹50,000
      const res = await client.query(
        `INSERT INTO accounts (id, user_id, balance, currency, status, version)
         VALUES ($1, $2, $3, 'INR', 'active', 0)
         RETURNING id`,
        [uuid(), userIds[idx], secondaryBalance]
      );
      accountIds.push(res.rows[0].id);
      accountBalances.push(secondaryBalance);
      console.log(`   ✓ Secondary account for ${USERS[idx].name}: ₹${(secondaryBalance / 100).toLocaleString('en-IN')}`);
    }

    // ── 3. Transactions ─────────────────────────────────────────────────────
    console.log('\nCreating transactions...');

    const transactions = [];

    // Helper to add a transaction record
    function addTx(from, to, amountPaise, status, fraudScore, fraudAction, daysBack, meta = {}) {
      transactions.push({
        id: uuid(),
        idempotency_key: idemKey(),
        from_account_id: accountIds[from],
        to_account_id: accountIds[to],
        amount: amountPaise,
        status,
        fraud_score: fraudScore,
        fraud_action: fraudAction,
        metadata: meta,
        created_at: daysAgo(daysBack),
      });
    }

    // ── Completed transactions (most recent first) ──────────────────────────
    addTx(7, 1,   5000_00, 'completed', 5,  'approve', 0,  { note: 'Dinner split' });
    addTx(0, 2,  15000_00, 'completed', 8,  'approve', 0,  { note: 'Freelance payment' });
    addTx(1, 3,   2500_00, 'completed', 3,  'approve', 1,  { note: 'Book purchase' });
    addTx(2, 0,  45000_00, 'completed', 12, 'approve', 1,  { note: 'Rent share' });
    addTx(3, 4,   8000_00, 'completed', 6,  'approve', 2,  { note: 'Gift' });
    addTx(4, 1,  22000_00, 'completed', 10, 'approve', 2,  { note: 'Investment return' });
    addTx(7, 0,  10000_00, 'completed', 4,  'approve', 3,  { note: 'Test transfer' });
    addTx(5, 7,   3500_00, 'completed', 7,  'approve', 3,  { note: 'Coffee meetup' });
    addTx(0, 6,  60000_00, 'completed', 15, 'approve', 4,  { note: 'Consulting fee' });
    addTx(6, 3,  12000_00, 'completed', 9,  'approve', 5,  { note: 'Electronics' });
    addTx(1, 0,  35000_00, 'completed', 11, 'approve', 5,  { note: 'EMI payment' });
    addTx(2, 4,   7500_00, 'completed', 5,  'approve', 6,  { note: 'Subscription' });
    addTx(3, 1,  18000_00, 'completed', 8,  'approve', 7,  { note: 'Salary advance' });
    addTx(4, 6,   4200_00, 'completed', 3,  'approve', 8,  { note: 'Uber rides' });
    addTx(7, 2,  25000_00, 'completed', 14, 'approve', 9,  { note: 'Equipment' });
    addTx(0, 1, 100000_00, 'completed', 20, 'approve', 10, { note: 'Project milestone' });
    addTx(6, 0,   9000_00, 'completed', 6,  'approve', 12, { note: 'Groceries split' });
    addTx(1, 4,  55000_00, 'completed', 18, 'approve', 14, { note: 'Course fee' });
    addTx(2, 7,   1500_00, 'completed', 2,  'approve', 15, { note: 'Snacks' });
    addTx(5, 3,  28000_00, 'completed', 13, 'approve', 18, { note: 'Medical bill' });

    // ── Pending transactions ────────────────────────────────────────────────
    addTx(7, 1,  50000_00, 'pending',   null, null,     0,  { note: 'Large transfer' });
    addTx(0, 3,   8500_00, 'pending',   null, null,     0,  { note: 'Utility bill' });
    addTx(4, 7,  12000_00, 'processing', 22, 'approve', 0,  { note: 'Quick send' });

    // ── Failed transactions ─────────────────────────────────────────────────
    addTx(5, 0,  500000_00, 'failed', 85, 'decline',  1, { note: 'Large suspicious transfer' });
    addTx(2, 6,  200000_00, 'failed', 72, 'decline',  3, { note: 'Unusual amount' });
    addTx(1, 5,   75000_00, 'failed', 65, 'challenge', 5, { note: 'Velocity breach' });

    // ── Flagged/review transactions ─────────────────────────────────────────
    addTx(0, 5, 150000_00, 'pending',    45, 'review',   0, { note: 'Under review — high amount' });
    addTx(3, 2, 300000_00, 'pending',    55, 'review',   1, { note: 'Under review — new recipient' });
    addTx(6, 1, 180000_00, 'pending',    68, 'challenge', 2, { note: 'Challenge issued' });

    // ── Reversed transactions ───────────────────────────────────────────────
    addTx(1, 6,  40000_00, 'reversed', 30, 'review', 7,  { note: 'Disputed — reversed' });
    addTx(4, 3,  95000_00, 'reversed', 42, 'review', 12, { note: 'Fraud reversal' });

    // ── Older history for volume chart ──────────────────────────────────────
    for (let day = 20; day <= 30; day++) {
      const from = randomInt(0, 7);
      let to = randomInt(0, 7);
      while (to === from) to = randomInt(0, 7);
      const amount = randomInt(1000_00, 80000_00);
      addTx(from, to, amount, 'completed', randomInt(1, 20), 'approve', day, { note: 'Historical' });
    }

    // Insert all transactions
    for (const tx of transactions) {
      await client.query(
        `INSERT INTO transactions 
           (id, idempotency_key, from_account_id, to_account_id, amount, currency, status, fraud_score, fraud_action, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, $8, $9, $10)`,
        [tx.id, tx.idempotency_key, tx.from_account_id, tx.to_account_id, tx.amount,
         tx.status, tx.fraud_score, tx.fraud_action, JSON.stringify(tx.metadata), tx.created_at]
      );
    }
    console.log(`   ✓ ${transactions.length} transactions created`);

    // ── 4. Fraud Signals ────────────────────────────────────────────────────
    console.log('\nCreating fraud signals...');
    let signalCount = 0;

    // Add signals to failed / review / challenge / reversed transactions
    const flaggedTxs = transactions.filter(t =>
      ['failed', 'reversed'].includes(t.status) ||
      ['review', 'challenge', 'decline'].includes(t.fraud_action)
    );

    const RULES = [
      { name: 'velocity_check',       baseScore: 15, data: (tx) => ({ count_1h: randomInt(3, 8), threshold: 3 }) },
      { name: 'amount_anomaly',       baseScore: 20, data: (tx) => ({ amount: tx.amount, avg_amount: Math.floor(tx.amount * 0.3), std_dev: 2.5 }) },
      { name: 'new_recipient',        baseScore: 10, data: (tx) => ({ first_transfer: true, recipient_age_days: 0 }) },
      { name: 'time_of_day',          baseScore: 8,  data: (tx) => ({ hour: new Date(tx.created_at).getHours(), risk_window: '00:00-05:00' }) },
      { name: 'device_fingerprint',   baseScore: 12, data: (tx) => ({ new_device: true, known_devices: randomInt(1, 3) }) },
      { name: 'location_mismatch',    baseScore: 18, data: (tx) => ({ usual_city: 'Mumbai', current_city: 'Kolkata' }) },
      { name: 'rapid_succession',     baseScore: 25, data: (tx) => ({ txns_in_5min: randomInt(4, 10), threshold: 3 }) },
    ];

    for (const tx of flaggedTxs) {
      // Each flagged transaction gets 1-3 fraud signals
      const numSignals = randomInt(1, 3);
      const selectedRules = [...RULES].sort(() => Math.random() - 0.5).slice(0, numSignals);

      for (const rule of selectedRules) {
        await client.query(
          `INSERT INTO fraud_signals (id, transaction_id, rule_name, score_added, signal_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuid(), tx.id, rule.name, rule.baseScore, JSON.stringify(rule.data(tx)), tx.created_at]
        );
        signalCount++;
      }
    }
    console.log(`   ✓ ${signalCount} fraud signals created across ${flaggedTxs.length} flagged transactions`);

    // ── 5. Ledger Entries ───────────────────────────────────────────────────
    console.log('\nCreating ledger entries...');
    let ledgerCount = 0;

    const completedTxs = transactions.filter(t => t.status === 'completed');
    // Track running balances per account for ledger accuracy
    const runningBalance = {};
    for (let i = 0; i < accountIds.length; i++) {
      runningBalance[accountIds[i]] = accountBalances[i];
    }

    // Sort by created_at to build ledger chronologically
    completedTxs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const tx of completedTxs) {
      const fromBefore = runningBalance[tx.from_account_id] || 0;
      const toBefore = runningBalance[tx.to_account_id] || 0;
      const fromAfter = fromBefore - tx.amount;
      const toAfter = toBefore + tx.amount;

      // Debit entry (sender)
      await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, balance_before, balance_after, created_at)
         VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7)`,
        [uuid(), tx.id, tx.from_account_id, tx.amount, fromBefore, fromAfter, tx.created_at]
      );

      // Credit entry (receiver)
      await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, balance_before, balance_after, created_at)
         VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7)`,
        [uuid(), tx.id, tx.to_account_id, tx.amount, toBefore, toAfter, tx.created_at]
      );

      runningBalance[tx.from_account_id] = fromAfter;
      runningBalance[tx.to_account_id] = toAfter;
      ledgerCount += 2;
    }
    console.log(`   ✓ ${ledgerCount} ledger entries created (${completedTxs.length} completed transactions × 2)`);

    // ── 6. Webhook Endpoints ────────────────────────────────────────────────
    console.log('\nCreating webhook endpoints...');

    const webhookUsers = [userIds[0], userIds[4]]; // Rahul and Vikram
    const webhookUrls = [
      'https://webhook.site/rahul-test-endpoint',
      'https://api.vikram-business.test/webhooks/settlr',
    ];
    const webhookEvents = [
      ['payment.completed', 'payment.failed'],
      ['payment.completed', 'payment.failed', 'payment.reversed'],
    ];

    for (let i = 0; i < webhookUsers.length; i++) {
      const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
      await client.query(
        `INSERT INTO webhook_endpoints (id, user_id, url, secret, events, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [uuid(), webhookUsers[i], webhookUrls[i], secret, webhookEvents[i]]
      );
      console.log(`   ✓ Webhook for ${USERS[i === 0 ? 0 : 4].name}: ${webhookUrls[i]}`);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('  SEED COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Users:          ${USERS.length}`);
    console.log(`  Accounts:       ${accountIds.length}`);
    console.log(`  Transactions:   ${transactions.length}`);
    console.log(`  Fraud signals:  ${signalCount}`);
    console.log(`  Ledger entries: ${ledgerCount}`);
    console.log(`  Webhooks:       ${webhookUsers.length}`);
    console.log('═'.repeat(60));
    console.log('\n  Login credentials (all users):');
    console.log('    Password: password123');
    console.log(`\n  Quick test account: test@settlr.dev / password123`);
    console.log('═'.repeat(60));

  } catch (err) {
    console.error('\nSeed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
