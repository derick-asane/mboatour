/**
 * Grants or revokes platform authority from the command line.
 *
 * The first super administrator has to be made this way: the portal only lets
 * an existing super admin appoint others, so there is no way in from the UI on
 * a fresh database.
 *
 *   node scripts/set-platform-role.mjs you@example.com SUPER_ADMIN
 *   node scripts/set-platform-role.mjs them@example.com ADMIN
 *   node scripts/set-platform-role.mjs them@example.com MEMBER   (revokes)
 */
import "dotenv/config";
import pg from "pg";

const ROLES = ["MEMBER", "ADMIN", "SUPER_ADMIN"];

const [email, role] = process.argv.slice(2);

if (!email || !role) {
  console.error("Usage: node scripts/set-platform-role.mjs <email> <role>");
  console.error(`Roles: ${ROLES.join(", ")}`);
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Use one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const { rowCount, rows } = await client.query(
    `update "User" set "platformRole" = $1::"PlatformRole", "updatedAt" = now()
     where lower(email) = lower($2)
     returning email, "platformRole"`,
    [role, email],
  );

  if (rowCount === 0) {
    console.error(`No account found for ${email}. Register it first.`);
    process.exitCode = 1;
  } else {
    console.log(`${rows[0].email} is now ${rows[0].platformRole}.`);
  }
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
