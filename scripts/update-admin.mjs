import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";
import { hashPassword, verifyPassword } from "../node_modules/.pnpm/better-auth@1.7.26_drizzle-_65d51ab2114925936a35030a55834e75/node_modules/better-auth/dist/crypto/index.mjs";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix",
});

await client.connect();

try {
  const targetEmail = process.argv[2] || "iam23yhb@gmail.com";
  const newPassword = process.argv[3] || "Admin338274";

  console.log(`Checking user: ${targetEmail}...`);
  const userRes = await client.query('SELECT id, name, email, role FROM "user" WHERE LOWER(email) = LOWER($1)', [targetEmail]);

  let userId;
  if (userRes.rows.length === 0) {
    console.log("User does not exist, creating admin user...");
    const createRes = await client.query(
      'INSERT INTO "user" (id, name, email, email_verified, role, onboarded) VALUES (gen_random_uuid()::text, $1, $2, true, $3, true) RETURNING id',
      ["Admin", targetEmail, "admin"]
    );
    userId = createRes.rows[0].id;
    console.log(`Created user with id: ${userId}`);
  } else {
    userId = userRes.rows[0].id;
    console.log(`Found existing user with id: ${userId}, role: ${userRes.rows[0].role}`);
    // Ensure role is admin
    await client.query('UPDATE "user" SET role = $1, email_verified = true WHERE id = $2', ["admin", userId]);
    console.log(`Updated user role to admin and verified email.`);
  }

  // Hash new password using Better Auth's standard algorithm
  const hashedPassword = await hashPassword(newPassword);

  // Check account
  const accountRes = await client.query('SELECT id, password FROM "account" WHERE user_id = $1 AND provider_id = $2', [userId, "credential"]);

  if (accountRes.rows.length === 0) {
    console.log("Creating credential account...");
    await client.query(
      'INSERT INTO "account" (id, account_id, provider_id, user_id, password) VALUES (gen_random_uuid()::text, $1, $2, $3, $4)',
      [userId, "credential", userId, hashedPassword]
    );
    console.log("Account created with new password.");
  } else {
    console.log("Updating existing credential account password...");
    await client.query(
      'UPDATE "account" SET password = $1, updated_at = now() WHERE user_id = $2 AND provider_id = $3',
      [hashedPassword, userId, "credential"]
    );
    console.log("Password updated successfully.");
  }

  // Verify that the password verifies properly
  const verifyRes = await client.query('SELECT password FROM "account" WHERE user_id = $1 AND provider_id = $2', [userId, "credential"]);
  const isMatch = await verifyPassword({ hash: verifyRes.rows[0].password, password: newPassword });
  console.log(`Verification test for password "${newPassword}":`, isMatch ? "SUCCESS ✓" : "FAILED ✗");

} catch (err) {
  console.error("Error setting admin password:", err);
  process.exit(1);
} finally {
  await client.end();
}
