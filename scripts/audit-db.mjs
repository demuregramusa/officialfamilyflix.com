import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix",
});

await client.connect();

try {
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log(`Found ${res.rows.length} tables in PostgreSQL database:`);
  for (const r of res.rows) {
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${r.table_name}"`);
      console.log(`  - ${r.table_name}: ${countRes.rows[0].count} rows`);
    } catch (err) {
      console.log(`  - ${r.table_name}: error (${err.message})`);
    }
  }
} finally {
  await client.end();
}
