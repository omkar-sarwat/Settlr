require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  const r = await c.query(
    "INSERT INTO accounts (user_id, balance, currency, status, version) VALUES ('f66496f0-fab5-494f-8381-024a103b0e7c', 10000000, 'INR', 'active', 0) RETURNING id, user_id, balance, status"
  );
  console.log('Account created:', JSON.stringify(r.rows[0], null, 2));
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
