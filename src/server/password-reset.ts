import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

/// Reset tokens live in the VerificationToken table Auth.js already defines, so
/// this needs no migration. The identifier is namespaced to keep them apart
/// from anything Auth.js stores there itself.
const IDENTIFIER_PREFIX = "password-reset:";

export const RESET_TOKEN_TTL_MINUTES = 60;

/// Only the hash is stored. A leaked database therefore yields no usable reset
/// links, the same reasoning that applies to passwords.
function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const identifier = `${IDENTIFIER_PREFIX}${userId}`;

  // A fresh request retires any link sent earlier.
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hash(token),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });

  return token;
}

/// Returns the user the token belongs to, or null when it is unknown, expired,
/// or already spent.
export async function resolvePasswordResetToken(
  token: string,
): Promise<{ userId: string } | null> {
  if (!token) return null;

  const record = await prisma.verificationToken.findUnique({
    where: { token: hash(token) },
  });

  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) return null;

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { token: record.token } });
    return null;
  }

  return { userId: record.identifier.slice(IDENTIFIER_PREFIX.length) };
}

/// A link works once: spend it as soon as the new password is set.
export async function consumePasswordResetTokens(userId: string): Promise<void> {
  await prisma.verificationToken.deleteMany({
    where: { identifier: `${IDENTIFIER_PREFIX}${userId}` },
  });
}
