require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  // Check omkar's accounts and balances
  const r1 = await c.query(
    "SELECT a.id, a.balance, a.currency, a.status, a.version, u.name FROM accounts a JOIN users u ON a.user_id = u.id WHERE u.email = 'sarswatomkar009@gmail.com'"
  );
  console.log('Omkar accounts:', JSON.stringify(r1.rows, null, 2));
  
  // Check total across all his accounts
  const r2 = await c.query(
    "SELECT SUM(balance) as total_paise FROM accounts WHERE user_id = 'f66496f0-fab5-494f-8381-024a103b0e7c'"
  );
  console.log('\nTotal paise:', r2.rows[0].total_paise);
  console.log('Total rupees:', Number(r2.rows[0].total_paise) / 100);
  
  // Check chart data for omkar's account
  const r3 = await c.query(`
    SELECT DATE(created_at) as date, 
           SUM(CASE WHEN from_account_id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5' THEN amount ELSE 0 END) as sent,
           SUM(CASE WHEN to_account_id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5' THEN amount ELSE 0 END) as received
    FROM transactions 
    WHERE (from_account_id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5' OR to_account_id = 'dd565fd6-8483-4edc-8444-739cbb8c15e5')
    AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  console.log('\nChart data (raw):', JSON.stringify(r3.rows, null, 2));
  
  // Count all his accounts
  const r4 = await c.query(
    "SELECT COUNT(*) as count FROM accounts WHERE user_id = 'f66496f0-fab5-494f-8381-024a103b0e7c'"
  );
  console.log('\nNumber of accounts:', r4.rows[0].count);
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
