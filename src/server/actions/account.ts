"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import {
  isOAuthProviderConfigured,
  isOAuthProviderId,
} from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import {
  failure,
  fieldFailure,
  type ActionState,
} from "@/server/action-state";
import { requireUser } from "@/server/session";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === "string" ? value : "";
  // Only same-origin paths, so a crafted `next` cannot bounce users off-site.
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function registerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= field;
    }
    return fieldFailure(fieldErrors);
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) return failure("emailTaken");

  const locale = await getLocale();

  await prisma.user.create({
    data: {
      name,
      email,
      locale,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  const next = safeNext(formData.get("next"));
  redirect(next ?? `/${locale}/dashboard`);
}

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return failure("invalidCredentials");

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) return failure("invalidCredentials");
    throw error;
  }

  const locale = await getLocale();
  const next = safeNext(formData.get("next"));
  redirect(next ?? `/${locale}/dashboard`);
}

/// Hands the visitor over to a social provider. Auth.js answers with a redirect
/// to the provider, so this never returns normally on success. Sign-up and
/// sign-in are the same call: the adapter creates the account on first use.
export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = String(formData.get("provider") ?? "");

  // A forged provider value must not reach Auth.js.
  if (!isOAuthProviderId(provider)) return;

  const locale = await getLocale();
  const from = safeNext(formData.get("from")) ?? `/${locale}/login`;

  // Buttons are always offered, so a provider without credentials has to say so
  // rather than start a flow that cannot complete.
  if (!isOAuthProviderConfigured(provider)) {
    redirect(`${from}?error=ProviderNotConfigured&provider=${provider}`);
  }

  const next = safeNext(formData.get("next"));

  await signIn(provider, { redirectTo: next ?? `/${locale}/dashboard` });
}

export async function signOutAction(): Promise<void> {
  const locale = await getLocale();
  await signOut({ redirectTo: `/${locale}` });
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
});

/// Lets any signed-in account edit its own name and email.
export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= field;
    }
    return fieldFailure(fieldErrors);
  }

  const { name, email } = parsed.data;

  if (email !== user.email) {
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (taken && taken.id !== user.id) return failure("emailTaken");
  }

  await prisma.user.update({ where: { id: user.id }, data: { name, email } });

  const locale = await getLocale();
  revalidatePath(`/${locale}/account`);

  return { success: "profileUpdated" };
}

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200),
});

/// Changes the sign-in password. An account created through a social provider
/// has no password yet, so it may set one without proving an old one.
export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? undefined,
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) return fieldFailure({ newPassword: "newPassword" });

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (record?.passwordHash) {
    const { currentPassword } = parsed.data;

    if (
      !currentPassword ||
      !(await bcrypt.compare(currentPassword, record.passwordHash))
    ) {
      return failure("wrongPassword");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });

  return { success: "passwordUpdated" };
}
