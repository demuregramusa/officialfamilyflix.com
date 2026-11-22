import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix" });
await c.connect();
const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
console.log("Database Tables:", res.rows.map(r => r.table_name));

const genresRes = await c.query("SELECT id, name, slug FROM genres ORDER BY name");
console.log("Genres in DB:", genresRes.rows);

const kindsRes = await c.query("SELECT kind, count(*) FROM movies GROUP BY kind");
console.log("Kinds in DB:", kindsRes.rows);

const yearRange = await c.query("SELECT min(year) as min_y, max(year) as max_y FROM movies");
console.log("Year Range:", yearRange.rows[0]);

await c.end();
