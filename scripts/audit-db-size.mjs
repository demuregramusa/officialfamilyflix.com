import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix",
});

await client.connect();

try {
  const sizeRes = await client.query("SELECT pg_size_pretty(pg_database_size('familyflix')) as db_size");
  console.log("Database 'familyflix' size on disk:", sizeRes.rows[0].db_size);
  
  const connRes = await client.query("SELECT count(*) as active_connections FROM pg_stat_activity");
  console.log("Active Postgres connections:", connRes.rows[0].active_connections);
} finally {
  await client.end();
}
