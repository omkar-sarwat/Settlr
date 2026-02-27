require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  const r = await c.query(
    "SELECT a.id as account_id, a.status as account_status, a.balance, u.name, u.email, u.is_active FROM accounts a JOIN users u ON a.user_id=u.id WHERE a.user_id='d53ed77d-8fbe-464d-b571-f67717529c15'"
  );
  console.log('Result:', JSON.stringify(r.rows, null, 2));
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
