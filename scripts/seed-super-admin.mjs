/**
 * Creates (or promotes) the platform's first super administrator so someone can
 * sign in through the normal login page on a fresh database.
 *
 *   npm run seed:admin
 *
 * Credentials come from the environment when set, otherwise the defaults below:
 *   SUPER_ADMIN_EMAIL     admin@mboatour.local
 *   SUPER_ADMIN_PASSWORD  Admin@Mboatour1
 *   SUPER_ADMIN_NAME      Platform Admin
 *
 * Running it twice is safe. An account that already exists is promoted and
 * keeps its password, unless SUPER_ADMIN_RESET_PASSWORD=true is set — which is
 * also how you recover from a forgotten admin password.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import pg from "pg";

const email = (process.env.SUPER_ADMIN_EMAIL ?? "admin@mboatour.local")
  .trim()
  .toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD ?? "Admin@Mboatour1";
const name = process.env.SUPER_ADMIN_NAME ?? "Platform Admin";
const resetPassword = process.env.SUPER_ADMIN_RESET_PASSWORD === "true";

if (password.length < 8) {
  console.error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const existing = await client.query(
    `select id, "passwordHash" from "User" where lower(email) = $1`,
    [email],
  );

  if (existing.rowCount > 0) {
    const { id, passwordHash } = existing.rows[0];
    // Only touch the password when asked, or when the account has none (it was
    // created through a social provider).
    const shouldSetPassword = resetPassword || !passwordHash;

    await client.query(
      `update "User"
       set "platformRole" = 'SUPER_ADMIN'::"PlatformRole",
           "passwordHash" = coalesce($2, "passwordHash"),
           "updatedAt" = now()
       where id = $1`,
      [id, shouldSetPassword ? await bcrypt.hash(password, 12) : null],
    );

    console.log(`Promoted existing account ${email} to SUPER_ADMIN.`);
    if (shouldSetPassword) console.log("Its password was set to the seed value.");
    else console.log("Its existing password was left alone.");
  } else {
    await client.query(
      `insert into "User" (id, name, email, "passwordHash", "platformRole", locale, "createdAt", "updatedAt")
       values ($1, $2, $3, $4, 'SUPER_ADMIN'::"PlatformRole", 'en', now(), now())`,
      [randomUUID(), name, email, await bcrypt.hash(password, 12)],
    );

    console.log(`Created super administrator ${email}.`);
  }

  console.log("");
  console.log("  Sign in at /login with:");
  console.log(`    email:    ${email}`);
  console.log(`    password: ${password}`);
  console.log("");
  console.log("  Change this password from the account page before going live.");
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
