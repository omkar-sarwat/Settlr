require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  // Find all real API transactions (i.e., those NOT from seed-impressive)
  // Seed-impressive creates transactions with created_at in the past (>= 30 days ago range)
  // Real API transactions have created_at close to NOW
  // Better: find transactions involving omkar's account or any non-seed account
  
  // Corrupted accounts: those whose balance got string-concatenated
  const corrupted = [
    '908c1487-9216-40c8-a55d-effc234816eb',
    'fc509400-c720-4b24-a86f-b7c1ce234fb0', 
    '103547ee-f866-49c9-a0ef-d10a5d476383',
  ];
  
  for (const acctId of corrupted) {
    // Get account info
    const acct = await c.query(
      "SELECT a.balance, u.name, u.email FROM accounts a JOIN users u ON a.user_id = u.id WHERE a.id = $1",
      [acctId]
    );
    const balStr = String(acct.rows[0].balance);
    console.log(`\nAccount ${acctId} (${acct.rows[0].name}):`);
    console.log(`  Current balance: "${balStr}"`);
    
    // Get all transactions involving this account that went through API
    // (transactions created after 2026-02-19, since seed was before)
    const apiTxns = await c.query(
      `SELECT id, from_account_id, to_account_id, amount, status, created_at 
       FROM transactions 
       WHERE (from_account_id = $1 OR to_account_id = $1) 
       AND created_at >= '2026-02-19T00:00:00Z'
       ORDER BY created_at`,
      [acctId]
    );
    console.log(`  API transactions: ${apiTxns.rows.length}`);
    for (const tx of apiTxns.rows) {
      const dir = tx.from_account_id === acctId ? 'SENT' : 'RECEIVED';
      console.log(`    ${dir} ${tx.amount} paise (${tx.status}) at ${tx.created_at}`);
    }
    
    // The corruption is from credits via API. For each API credit, the balance was string-concatenated.
    // To reverse: figure out the pre-API balance and apply correct arithmetic.
    
    // Step 1: Get the seed-time balance (set by seed-impressive or INSERT)
    // Since seed-impressive only explicitly sets test user and savings accounts,
    // other accounts keep their INSERT balance + seed transaction deltas.
    // But seed transactions don't go through the payment API (direct SQL), so they don't corrupt.
    
    // The simplest approach: 
    // 1. Find all seed-era transactions (before 2026-02-19) and compute their delta
    // 2. Find the INSERT balance from the seed
    // 3. Correct balance = INSERT balance + seed delta + API delta (with correct arithmetic)
    
    const seedTxns = await c.query(
      `SELECT from_account_id, to_account_id, amount, status
       FROM transactions 
       WHERE (from_account_id = $1 OR to_account_id = $1) 
       AND status = 'completed'
       AND created_at < '2026-02-19T00:00:00Z'`,
      [acctId]
    );
    
    let seedDelta = 0;
    for (const tx of seedTxns.rows) {
      if (tx.from_account_id === acctId) seedDelta -= Number(tx.amount);
      if (tx.to_account_id === acctId) seedDelta += Number(tx.amount);
    }
    
    let apiDelta = 0;
    for (const tx of apiTxns.rows) {
      if (tx.status !== 'completed') continue;
      if (tx.from_account_id === acctId) apiDelta -= Number(tx.amount);
      if (tx.to_account_id === acctId) apiDelta += Number(tx.amount);
    }
    
    console.log(`  Seed transaction delta: ${seedDelta}`);
    console.log(`  API transaction delta: ${apiDelta}`);
  }

  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
