/// Every provider is offered on the auth pages. One whose credentials are
/// missing sends the visitor back with a `ProviderNotConfigured` message rather
/// than starting a flow that cannot complete.

export const OAUTH_PROVIDER_IDS = ["google", "apple", "facebook"] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

/// Auth.js infers these names itself; they are listed so the UI can tell which
/// providers are usable before offering them.
const CREDENTIAL_ENV_VARS: Record<OAuthProviderId, [string, string]> = {
  google: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  apple: ["AUTH_APPLE_ID", "AUTH_APPLE_SECRET"],
  facebook: ["AUTH_FACEBOOK_ID", "AUTH_FACEBOOK_SECRET"],
};

/// Provider names are trademarks and stay untranslated.
export const OAUTH_PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
};

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isOAuthProviderConfigured(id: OAuthProviderId): boolean {
  return CREDENTIAL_ENV_VARS[id].every((name) => Boolean(process.env[name]));
}

/// Maps the `?error=` code Auth.js puts on the sign-in page to a message key.
/// `ProviderNotConfigured` is our own code, not one of Auth.js's.
export function authErrorMessageKey(error: string): string {
  if (error === "ProviderNotConfigured") return "providerNotConfigured";
  if (error === "OAuthAccountNotLinked") return "accountNotLinked";
  if (error === "AccessDenied") return "oauthAccessDenied";
  if (error === "CredentialsSignin") return "invalidCredentials";
  return "oauthFailed";
}
