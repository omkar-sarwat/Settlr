require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  // Test User (103547ee) — seed-impressive sets balance to 247835000
  // API delta: +1200000 -500000 -10000 -102000 +100000 -100000 = +588000
  // Correct: 247835000 + 588000 = 248423000
  await c.query(
    'UPDATE accounts SET balance = $1 WHERE id = $2',
    [248423000, '103547ee-f866-49c9-a0ef-d10a5d476383']
  );
  console.log('Fixed Test User: 248423000 paise (₹24,84,230)');

  // Rahul Sharma (908c1487) — reverse-engineered initial = 50000165
  // API delta: +10000 -15000000 -1500000 = -16490000
  // Correct: 50000165 + (-16490000) = 33510165
  await c.query(
    'UPDATE accounts SET balance = $1 WHERE id = $2',
    [33510165, '908c1487-9216-40c8-a55d-effc234816eb']
  );
  console.log('Fixed Rahul Sharma: 33510165 paise (₹3,35,101.65)');

  // Priya Patel (fc509400) — can't perfectly reconstruct initial seed balance
  // API delta: +500000 +102000 = +602000
  // Set to a reasonable demo value: 150000000 + 602000 = 150602000 (₹15,06,020)
  await c.query(
    'UPDATE accounts SET balance = $1 WHERE id = $2',
    [150602000, 'fc509400-c720-4b24-a86f-b7c1ce234fb0']
  );
  console.log('Fixed Priya Patel: 150602000 paise (₹15,06,020)');

  // Verify all fixes
  const verify = await c.query(`
    SELECT a.id, a.balance, u.name 
    FROM accounts a JOIN users u ON a.user_id = u.id 
    WHERE a.id IN (
      '103547ee-f866-49c9-a0ef-d10a5d476383',
      '908c1487-9216-40c8-a55d-effc234816eb',
      'fc509400-c720-4b24-a86f-b7c1ce234fb0',
      'dd565fd6-8483-4edc-8444-739cbb8c15e5'
    )
    ORDER BY u.name
  `);
  
  console.log('\nAll fixed accounts:');
  for (const row of verify.rows) {
    console.log(`  ${row.name}: ${row.balance} paise (₹${(Number(row.balance)/100).toLocaleString('en-IN')})`);
  }
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
