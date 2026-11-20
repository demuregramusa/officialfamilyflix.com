import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { isStaffRole } from "./admin/permissions";
import { db } from "./db";
import * as authSchema from "./db/auth-schema";
import * as schema from "./db/schema";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema, ...authSchema },
  }),
  trustedOrigins: ["*"],
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
          // Public visitors sign up as regular members; staff accounts are
          // created by a signed-in administrator from the Staff page. The only
          // roles the sign-up path may ever produce are "user" and staff roles,
          // so anything else is rejected.
          if (createdUser.role === "user" || isStaffRole(createdUser.role)) return;

          throw new APIError("UNPROCESSABLE_ENTITY", {
            message: "That account type is not available for self-sign-up.",
          });
        },
        after: async (createdUser) => {
          if (isStaffRole(createdUser.role)) return;

          const [existingAdmin] = await db
            .select({ id: authSchema.user.id })
            .from(authSchema.user)
            .where(eq(authSchema.user.role, "admin"))
            .limit(1);
          if (existingAdmin) return;

          await db
            .update(authSchema.user)
            .set({ role: "admin" })
            .where(eq(authSchema.user.id, createdUser.id));
        },
      },
    },
  },
  advanced: isProduction
    ? undefined
    : {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
        },
      },
});
