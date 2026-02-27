require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  const acctId = 'dd565fd6-8483-4edc-8444-739cbb8c15e5';
  
  // All transactions for omkar's account
  const r1 = await c.query(
    `SELECT id, from_account_id, to_account_id, amount, status, created_at 
     FROM transactions 
     WHERE from_account_id = $1 OR to_account_id = $1
     ORDER BY created_at`,
    [acctId]
  );
  console.log('Transactions:', JSON.stringify(r1.rows, null, 2));
  
  // Expected balance: starting 10000000, minus sent, plus received
  let balance = 10000000; // initial seed
  for (const tx of r1.rows) {
    if (tx.status !== 'completed') continue;
    if (tx.from_account_id === acctId) balance -= Number(tx.amount);
    if (tx.to_account_id === acctId) balance += Number(tx.amount);
  }
  console.log('\nExpected balance (paise):', balance);
  console.log('Expected balance (rupees):', balance / 100);
  console.log('Actual DB balance:', '9900000100000');
  
  // Check if seed-impressive.js set balance directly
  // Also check ledger entries for this account
  const r2 = await c.query(
    `SELECT id, account_id, type, amount, balance_after, created_at
     FROM ledger 
     WHERE account_id = $1
     ORDER BY created_at`,
    [acctId]
  );
  console.log('\nLedger entries:', JSON.stringify(r2.rows, null, 2));
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
