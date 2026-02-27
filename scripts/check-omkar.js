require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();

  const u = await c.query("SELECT id, name, email, created_at FROM users WHERE email = 'sarswatomkar009@gmail.com'");
  console.log('USER:', JSON.stringify(u.rows[0], null, 2));

  if (u.rows[0]) {
    const a = await c.query("SELECT id, user_id, balance, status, created_at FROM accounts WHERE user_id = $1 ORDER BY created_at", [u.rows[0].id]);
    console.log('ACCOUNTS:', JSON.stringify(a.rows, null, 2));
  }

  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
