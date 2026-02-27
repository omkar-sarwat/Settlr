require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client(process.env.DATABASE_URL);
  await c.connect();
  
  const query = "NameFix";
  const r = await c.query(
    `SELECT accounts.id, accounts.user_id, users.email, users.name 
     FROM accounts 
     JOIN users ON accounts.user_id = users.id 
     WHERE (LOWER(users.email) LIKE $1 OR LOWER(users.name) LIKE $1)
     AND users.is_active = true 
     AND accounts.status = 'active'
     LIMIT 10`,
    [`%${query.toLowerCase()}%`]
  );
  console.log('SQL result:', JSON.stringify(r.rows, null, 2));
  
  // Also check what the DB has
  const r2 = await c.query("SELECT id, name, email FROM users WHERE name IS NOT NULL LIMIT 20");
  console.log('\nAll users with names:', JSON.stringify(r2.rows, null, 2));
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
