import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import * as schema from "@workspace/db/schema";
import { db, user } from "@workspace/db";
import { isStaffRole } from "./lib/permissions";

const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET;

if (!authSecret) {
  throw new Error("Set BETTER_AUTH_SECRET or SESSION_SECRET before starting auth.");
}

const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  secret: authSecret,
  ...(process.env.BETTER_AUTH_URL ? { baseURL: process.env.BETTER_AUTH_URL } : {}),
  ...(configuredOrigins?.length ? { trustedOrigins: configuredOrigins } : {}),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (createdUser) => {
          if (createdUser.role === "user" || isStaffRole(createdUser.role)) return;
          throw new APIError("UNPROCESSABLE_ENTITY", {
            message: "That account type is not available for self-sign-up.",
          });
        },
        after: async (createdUser) => {
          const bootstrapEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
          if (!bootstrapEmail || createdUser.email.toLowerCase() !== bootstrapEmail) return;

          const [existingAdmin] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.role, "admin"))
            .limit(1);
          if (existingAdmin) return;

          await db.update(user).set({ role: "admin" }).where(eq(user.id, createdUser.id));
        },
      },
    },
  },
});
