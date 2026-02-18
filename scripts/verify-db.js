require('dotenv').config();
const { Client } = require('pg');

async function verify() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  const r = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  r.rows.forEach((row) => console.log('  ' + row.table_name));
  console.log('Total:', r.rows.length, 'tables');
  await c.end();
}

verify().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
