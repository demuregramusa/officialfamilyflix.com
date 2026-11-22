process.env.PORT = process.env.PORT || "5000";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "familyflix-production-secret-key-2026";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:5000";

console.log(`Starting FamilyFlix server on port ${process.env.PORT}...`);
await import("../artifacts/api-server/dist/index.mjs");
