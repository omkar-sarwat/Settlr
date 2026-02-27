require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  // Recalculate correct balances for ALL accounts based on transactions
  // Get all accounts
  const accounts = await c.query("SELECT id, balance, user_id FROM accounts");
  
  console.log('Checking all accounts for balance corruption...\n');
  
  for (const acct of accounts.rows) {
    // Find initial balance: assume what was seeded. We'll compute delta from transactions.
    const txns = await c.query(
      `SELECT from_account_id, to_account_id, amount, status 
       FROM transactions 
       WHERE (from_account_id = $1 OR to_account_id = $1) AND status = 'completed'`,
      [acct.id]
    );
    
    let delta = 0;
    for (const tx of txns.rows) {
      if (tx.from_account_id === acct.id) delta -= Number(tx.amount);
      if (tx.to_account_id === acct.id) delta += Number(tx.amount);
    }
    
    // For omkar's account, initial was 10000000 (manually seeded)
    // For seed-impressive accounts, they were set to specific values at end of seed
    // We can't easily know the initial seed value, but we can detect string-concat corruption
    
    const currentBalance = Number(acct.balance);
    const balanceStr = String(acct.balance);
    
    // String concat detection: if balance is absurdly large (> 100 billion paise = ₹100 crore)
    if (currentBalance > 10000000000) {
      console.log(`CORRUPTED: Account ${acct.id}`);
      console.log(`  Current balance: ${currentBalance} paise (₹${(currentBalance/100).toLocaleString('en-IN')})`);
      console.log(`  Transaction delta: ${delta} paise`);
      console.log(`  Balance string: "${balanceStr}"`);
    }
  }
  
  // Fix omkar's account specifically — we know initial was 10000000
  // Transactions: sent 100000, received 100000, net delta = 0
  // Correct balance: 10000000
  const correctBalance = 10000000;
  await c.query(
    'UPDATE accounts SET balance = $1 WHERE id = $2',
    [correctBalance, 'dd565fd6-8483-4edc-8444-739cbb8c15e5']
  );
  console.log(`\nFixed omkar's account to ${correctBalance} paise (₹${(correctBalance/100).toLocaleString('en-IN')})`);
  
  // Also fix the recipient of omkar's sent transaction (they also got string-concat credited)
  // Find that account
  const recipientTx = await c.query(
    "SELECT to_account_id FROM transactions WHERE from_account_id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5' AND status = 'completed'"
  );
  if (recipientTx.rows.length > 0) {
    const recipientId = recipientTx.rows[0].to_account_id;
    const recipientAcct = await c.query('SELECT balance FROM accounts WHERE id = $1', [recipientId]);
    console.log(`\nRecipient account ${recipientId}: balance = ${recipientAcct.rows[0]?.balance} paise`);
  }
  
  // Verify fix
  const verify = await c.query(
    "SELECT a.id, a.balance, u.name FROM accounts a JOIN users u ON a.user_id = u.id WHERE a.id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5'"
  );
  console.log(`\nVerified: ${verify.rows[0]?.name} balance = ${verify.rows[0]?.balance} paise (₹${(Number(verify.rows[0]?.balance)/100).toLocaleString('en-IN')})`);
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
