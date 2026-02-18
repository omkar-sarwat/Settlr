const {Client} = require('pg');
const c = new Client('postgresql://postgres.slytepyimmjddfpudwek:9860545806%40aA@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres');
c.connect().then(async () => {
  await c.query('UPDATE accounts SET balance = 100000 WHERE id = $1', ['b2b9861b-54d3-43c3-8573-3c6173ad804a']);
  const r = await c.query('SELECT id, balance FROM accounts WHERE id = $1', ['b2b9861b-54d3-43c3-8573-3c6173ad804a']);
  console.log('Updated:', JSON.stringify(r.rows[0]));
  await c.end();
});
